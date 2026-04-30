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
        JSON.stringify({ data: null, error: { code: 'BAD_REQUEST', message: 'id_token is required' } }),
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
        JSON.stringify({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid LINE token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lineUser = await verifyRes.json();
    const { sub: lineUserId, name: displayName, picture: pictureUrl } = lineUser;

    // Supabase Admin クライアント
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // users テーブルにupsert
    const { data: user, error: upsertError } = await supabase
      .from('m_users')
      .upsert(
        { line_user_id: lineUserId, display_name: displayName, picture_url: pictureUrl, updated_at: new Date().toISOString() },
        { onConflict: 'line_user_id' }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Supabase JWT発行（カスタムクレーム付き）
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${lineUserId}@line.kusuri.app`,
      options: {
        data: {
          line_user_id: lineUserId,
          display_name: displayName,
          picture_url: pictureUrl,
          is_superadmin: user.is_superadmin,
        },
      },
    });

    if (authError) throw authError;

    // usersテーブルのidをauth.uidに合わせるためsignInWithPassword相当のJWT取得
    const { data: session, error: sessionError } = await supabase.auth.admin.createUser({
      email: `${lineUserId}@line.kusuri.app`,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, display_name: displayName },
      app_metadata: { is_superadmin: user.is_superadmin },
    });

    // 既存ユーザーの場合はエラーを無視してJWT生成
    const userId = session?.user?.id || (await supabase
      .from('m_users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single()
      .then(r => r.data?.id));

    const jwt = authData?.properties?.hashed_token ?? '';

    return new Response(
      JSON.stringify({
        data: {
          user_id: userId,
          display_name: displayName,
          picture_url: pictureUrl,
          is_superadmin: user.is_superadmin,
          access_token: jwt,
        },
        error: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ data: null, error: { code: 'INTERNAL_ERROR', message: String(err) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
