'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import { formatDate } from '@/lib/utils';
import type { OrganizationInvitation, Organization } from '@/types/app';

interface InviteInfo {
  invitation: OrganizationInvitation;
  organization: Organization;
  inviterName: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, setCurrentOrganization, setOrganizations, organizations } = useAppStore();
  const supabase = createClient();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('organization_invitations')
        .select('*, organization:organizations(*)')
        .eq('token', token)
        .is('used_at', null)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (err || !data) {
        setError('この招待リンクは無効か期限切れです。');
      } else {
        const { data: inviter } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', data.invited_by)
          .single();
        setInfo({
          invitation: data,
          organization: data.organization as Organization,
          inviterName: inviter?.display_name ?? '不明',
        });
      }
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!info || !user) return;
    setJoining(true);
    try {
      await supabase.functions.invoke('accept-invite', {
        body: { token, user_id: user.id },
      });
      const newOrgs = [...organizations, info.organization];
      setOrganizations(newOrgs);
      setCurrentOrganization(info.organization, info.invitation.role);
      router.push('/dashboard');
    } catch (err) {
      setError('参加に失敗しました。もう一度お試しください。');
    } finally {
      setJoining(false);
    }
  };

  const roleLabel: Record<string, string> = {
    owner: 'オーナー',
    editor: '編集者',
    viewer: '閲覧者',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-4xl text-center mb-4">🏥</div>
          <h1 className="text-lg font-bold text-gray-900 text-center mb-6">
            お薬手帳・通院記録くん
          </h1>

          {error ? (
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="font-semibold text-gray-800 mb-2">この招待リンクは無効です</p>
              <p className="text-sm text-gray-500 mb-6">
                招待リンクが期限切れか、すでに使用済みです。<br />
                招待した方に新しいリンクを発行してもらってください。
              </p>
              <a href="/" className="btn-primary inline-flex">ログインページへ</a>
            </div>
          ) : info ? (
            <div>
              <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">招待が届いています</p>
                <p className="font-semibold text-gray-900 mb-1">
                  {info.inviterName} さんから
                </p>
                <p className="text-lg font-bold text-indigo-700 mb-3">
                  「{info.organization.name}」への招待
                </p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>参加後の権限: <span className="font-medium">{roleLabel[info.invitation.role] ?? info.invitation.role}</span></p>
                  <p>有効期限: <span className="font-medium">{formatDate(info.invitation.expires_at)}</span>まで</p>
                </div>
              </div>

              {!user ? (
                <a
                  href="/"
                  className="btn-primary w-full text-center block"
                >
                  LINEでログインして参加する
                </a>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={joining}
                  className="btn-primary w-full"
                >
                  {joining ? '参加中...' : '参加する'}
                </button>
              )}

              <button
                onClick={() => router.push('/')}
                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                参加しない
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
