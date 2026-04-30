'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Link2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Organization } from '@/types/app';

type Step = 'choose' | 'create' | 'join';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setCurrentOrganization, setOrganizations } = useAppStore();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('choose');
  const [orgName, setOrgName] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');
    try {
      // organizations INSERT
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName.trim(), plan: 'free' })
        .select()
        .single();
      if (orgError) throw orgError;

      // organization_users INSERT (owner)
      await supabase.from('organization_users').insert({
        organization_id: org.id,
        user_id: user!.id,
        role: 'owner',
      });

      setOrganizations([org as Organization]);
      setCurrentOrganization(org as Organization, 'owner');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('グループの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinViaUrl = () => {
    const token = inviteUrl.split('/invite/')[1]?.split('?')[0];
    if (token) {
      router.push(`/invite/${token}`);
    } else {
      setError('招待URLの形式が正しくありません。');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-4xl text-center mb-2">🏥</div>
          <h1 className="text-lg font-bold text-gray-900 text-center mb-1">
            お薬手帳・通院記録くん
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            ようこそ、{user?.display_name} さん！<br />
            はじめに、グループの設定をしてください。
          </p>

          {step === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('create')}
                className="w-full flex items-start gap-4 p-4 border-2 border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
              >
                <PlusCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">新しいグループを作成する</p>
                  <p className="text-sm text-gray-500 mt-0.5">家族・自分だけの新しいグループを始める</p>
                </div>
              </button>

              <button
                onClick={() => setStep('join')}
                className="w-full flex items-start gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors text-left"
              >
                <Link2 className="w-6 h-6 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">招待リンクで参加する</p>
                  <p className="text-sm text-gray-500 mt-0.5">すでにグループを持つ方から招待を受けた</p>
                </div>
              </button>
            </div>
          )}

          {step === 'create' && (
            <div>
              <button onClick={() => setStep('choose')} className="text-sm text-indigo-600 mb-4 flex items-center gap-1">
                ← 戻る
              </button>
              <p className="text-sm font-medium text-gray-700 mb-2">グループ名を決めてください</p>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="例: 山田家"
                className="input mb-4"
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mb-6">※ 後から変更できます</p>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <button
                onClick={handleCreateOrg}
                disabled={!orgName.trim() || loading}
                className="btn-primary w-full"
              >
                {loading ? '作成中...' : '作成する →'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-4">
                作成後、30日間無料でお試しいただけます。
              </p>
            </div>
          )}

          {step === 'join' && (
            <div>
              <button onClick={() => setStep('choose')} className="text-sm text-indigo-600 mb-4 flex items-center gap-1">
                ← 戻る
              </button>
              <p className="text-sm font-medium text-gray-700 mb-2">招待URLを入力してください</p>
              <input
                type="text"
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                placeholder="https://app.example.com/invite/..."
                className="input mb-4"
              />
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <button
                onClick={handleJoinViaUrl}
                disabled={!inviteUrl.trim()}
                className="btn-primary w-full"
              >
                参加する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
