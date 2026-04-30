'use client';

import { ExternalLink, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppStore } from '@/stores/appStore';
import { formatDate, getPlanLabel } from '@/lib/utils';

const PLANS = [
  {
    key: 'free',
    label: 'フリー',
    price: 0,
    features: ['1名のみ', 'OCR月5回まで', '基本機能のみ'],
  },
  {
    key: 'standard',
    label: 'スタンダード',
    price: 980,
    features: ['家族6名まで', 'OCR無制限', '全機能利用可', 'CSV出力'],
    recommended: true,
  },
  {
    key: 'premium',
    label: 'プレミアム',
    price: 1980,
    features: ['家族無制限', 'OCR無制限', '全機能利用可', '優先サポート'],
  },
];

export default function SubscriptionPage() {
  const { currentOrganization, currentRole } = useAppStore();

  if (currentRole !== 'owner') {
    return <AppLayout title="サブスクリプション"><p className="text-gray-500">この操作はオーナーのみ実行できます。</p></AppLayout>;
  }

  const currentPlan = currentOrganization?.plan ?? 'free';

  return (
    <AppLayout title="サブスクリプション管理">
      <div className="max-w-3xl space-y-6">
        {/* 現在のプラン */}
        <div className="card p-6">
          <h2 className="section-title">現在のプラン</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900">
                {getPlanLabel(currentPlan)}プラン
                {currentPlan !== 'free' && <span className="text-base font-normal text-gray-500 ml-2">¥{currentPlan === 'standard' ? '980' : '1,980'} / 月</span>}
              </p>
              {currentOrganization?.status === 'trial' && currentOrganization.trial_ends_at && (
                <p className="text-sm text-indigo-600 mt-1">
                  トライアル期間中 （{formatDate(currentOrganization.trial_ends_at)}まで）
                </p>
              )}
              {currentOrganization?.stripe_subscription_id && (
                <p className="text-xs text-gray-400 mt-1">
                  Stripe ID: {currentOrganization.stripe_subscription_id}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* プラン一覧 */}
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            return (
              <div
                key={plan.key}
                className={`card p-5 relative ${plan.recommended ? 'border-indigo-400 border-2' : ''}`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full">
                    おすすめ
                  </span>
                )}
                <p className="font-bold text-gray-900 mb-1">{plan.label}</p>
                <p className="text-2xl font-bold tabular-nums mb-3">
                  {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
                  {plan.price > 0 && <span className="text-sm font-normal text-gray-400">/月</span>}
                </p>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className="block text-center text-sm font-medium text-indigo-600 bg-indigo-50 py-2 rounded-lg">
                    現在のプラン
                  </span>
                ) : (
                  <button
                    className={plan.price > currentPlanPrice(currentPlan) ? 'btn-primary w-full' : 'btn-secondary w-full'}
                    onClick={() => alert('Stripe Checkout（開発中）')}
                  >
                    {plan.price > currentPlanPrice(currentPlan) ? 'アップグレード' : 'ダウングレード'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 解約 */}
        {currentPlan !== 'free' && (
          <div className="card p-5">
            <p className="text-sm text-gray-600 mb-3">
              解約すると、月末まで引き続きご利用いただけます。その後フリープランに移行します。
            </p>
            <button
              className="text-sm text-red-500 hover:text-red-700"
              onClick={() => alert('解約処理（Stripe連携）')}
            >
              解約する（月末まで利用可）
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function currentPlanPrice(plan: string) {
  if (plan === 'standard') return 980;
  if (plan === 'premium') return 1980;
  return 0;
}
