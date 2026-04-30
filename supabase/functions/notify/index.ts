import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, message } = await req.json();
    if (!user_id || !message) {
      return new Response(
        JSON.stringify({ data: null, error: { code: 'BAD_REQUEST', message: 'user_id and message are required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // LINE User ID 取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('line_user_id')
      .eq('id', user_id)
      .single();

    if (userError || !user?.line_user_id) {
      return new Response(
        JSON.stringify({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LINE Messaging API でプッシュ通知
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.line_user_id,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!lineRes.ok) {
      const errBody = await lineRes.text();
      throw new Error(`LINE API error: ${errBody}`);
    }

    // notifications テーブルに sent_at を更新
    await supabase
      .from('notifications')
      .update({ sent_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .is('sent_at', null)
      .eq('is_cancelled', false)
      .lte('scheduled_at', new Date().toISOString());

    return new Response(
      JSON.stringify({ data: { success: true }, error: null }),
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
