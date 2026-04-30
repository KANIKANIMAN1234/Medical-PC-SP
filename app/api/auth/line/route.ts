import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID!;
    const clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_LINE_LOGIN_REDIRECT_URI!;

    // LINE Token API（サーバーサイドで client_secret を使用）
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('LINE token error:', tokenData);
      return NextResponse.json(
        { error: 'LINEトークンの取得に失敗しました', detail: tokenData },
        { status: 400 }
      );
    }

    return NextResponse.json({ id_token: tokenData.id_token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
