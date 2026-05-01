import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { id_token } = await req.json();
    if (!id_token) {
      return new Response(
        JSON.stringify({ data: null, error: 'id_token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LINE IDトークン検証
    const lineChannelId = Deno.env.get('LINE_LOGIN_CHANNEL_ID')!;
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token, client_id: lineChannelId }),
    });

    if (!verifyRes.ok) {
      return new Response(
        JSON.stringify({ data: null, error: 'Invalid LINE token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lineUser = await verifyRes.json();
    const { sub: lineUserId, name: displayName, picture: pictureUrl } = lineUser;
    const email = `${lineUserId}@line.kusuri.app`;

    // Supabase Admin クライアント
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth ユーザーが存在しない場合は作成（既存の場合はエラーを無視）
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, display_name: displayName, picture_url: pictureUrl },
    });

    // Magic link トークンを生成（ユーザーが既存でも動作する）
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        data: { line_user_id: lineUserId, display_name: displayName, picture_url: pictureUrl },
      },
    });
    if (linkError) throw linkError;

    const authUserId = linkData.user.id;

    // m_users テーブルにupsert（id を auth user id に揃える）
    const { data: existingUser } = await supabase
      .from('m_users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle();

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('m_users')
        .insert({
          id: authUserId,
          line_user_id: lineUserId,
          display_name: displayName,
          picture_url: pictureUrl,
        });
      if (insertError) throw insertError;
    } else {
      await supabase
        .from('m_users')
        .update({ display_name: displayName, picture_url: pictureUrl, updated_at: new Date().toISOString() })
        .eq('line_user_id', lineUserId);
    }

    return new Response(
      JSON.stringify({
        data: { hashed_token: linkData.properties.hashed_token },
        error: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ data: null, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
