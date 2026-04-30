'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';

const LINE_LOGIN_URL = 'https://access.line.me/oauth2/v2.1/authorize';

function buildLineLoginUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_LINE_LOGIN_REDIRECT_URI!,
    state: crypto.randomUUID(),
    scope: 'profile openid',
  });
  return `${LINE_LOGIN_URL}?${params.toString()}`;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, currentOrganization } = useAppStore();

  useEffect(() => {
    if (user) {
      router.push(currentOrganization ? '/dashboard' : '/onboarding');
    }
  }, [user, currentOrganization, router]);

  const handleLineLogin = () => {
    window.location.href = buildLineLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-sm mx-4">
        {/* カード */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* ロゴ */}
          <div className="text-5xl mb-4">🏥</div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">お薬手帳・通院記録くん</h1>
          <p className="text-sm text-gray-500 mb-8">医療情報を、かんたんに管理。</p>

          {/* LINEログインボタン */}
          <button
            onClick={handleLineLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05a847] text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-base"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEでログイン
          </button>

          <p className="text-xs text-gray-400 mt-4">※ LINEアカウントが必要です</p>
        </div>

        {/* フッター */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 お薬手帳・通院記録くん
        </p>
      </div>
    </div>
  );
}
