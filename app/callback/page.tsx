'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Organization, OrganizationUser } from '@/types/app';

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <CallbackInner />
    </Suspense>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">ログイン中...</p>
      </div>
    </div>
  );
}

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { setUser, setCurrentOrganization, setOrganizations } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('認証コードが見つかりません');
      return;
    }

    (async () => {
      try {
        // Step 1: LINE code → id_token（サーバー側で client_secret を使用）
        const tokenRes = await fetch('/api/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.id_token) {
          throw new Error(tokenData.error || 'IDトークンの取得に失敗しました');
        }

        // Step 2: id_token → hashed_token（Supabase Edge Function）
        const authRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-line`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ id_token: tokenData.id_token }),
          }
        );
        const { data: authData, error: authError } = await authRes.json();
        if (authError) throw new Error(authError);

        // Step 3: hashed_token → Supabase セッション
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: authData.hashed_token,
          type: 'magiclink',
        });
        if (sessionError) throw sessionError;
        if (!sessionData.user) throw new Error('セッションの取得に失敗しました');

        // Step 4: m_users からユーザー情報取得
        const { data: userData, error: userError } = await supabase
          .from('m_users')
          .select('*')
          .eq('id', sessionData.user.id)
          .single();
        if (userError) throw userError;
        setUser(userData);

        // Step 5: 所属組織を確認してルーティング
        const { data: orgUsersData } = await supabase
          .from('m_organization_users')
          .select('*, organization:m_organizations(*)')
          .eq('user_id', userData.id);

        if (orgUsersData && orgUsersData.length > 0) {
          const orgs = orgUsersData.map((ou: OrganizationUser) => ou.organization as Organization).filter(Boolean);
          setOrganizations(orgs);
          const firstOrgUser = orgUsersData[0] as OrganizationUser;
          setCurrentOrganization(firstOrgUser.organization as Organization, firstOrgUser.role);
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } catch (err) {
        console.error(err);
        setError(`ログインに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/" className="text-indigo-600 underline text-sm">
            ログインページへ戻る
          </a>
        </div>
      </div>
    );
  }

  return <LoadingView />;
}
