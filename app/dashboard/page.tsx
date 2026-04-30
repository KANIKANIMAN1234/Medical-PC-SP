'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Calendar, TrendingUp, ArrowRight, Pill, Activity } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { JudgmentBadge } from '@/components/common/JudgmentBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDashboard } from '@/hooks/useDashboard';
import { useAppStore } from '@/stores/appStore';
import { formatCurrency, formatDateShort, getDaysRemaining } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, currentOrganization } = useAppStore();
  const { data, isLoading } = useDashboard();

  useEffect(() => {
    if (!user) router.push('/');
    else if (!currentOrganization) router.push('/onboarding');
  }, [user, currentOrganization, router]);

  if (isLoading || !data) {
    return (
      <AppLayout title="ダッシュボード">
        <LoadingSpinner className="h-64" label="データを読み込み中..." />
      </AppLayout>
    );
  }

  const isDeductible = data.yearly_expense >= 100000;

  return (
    <AppLayout title="ダッシュボード">
      <div className="space-y-6 max-w-5xl">
        {/* 医療費控除アラート */}
        {isDeductible && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            今年の医療費が10万円を超えています。医療費控除の申告をご検討ください。
          </div>
        )}

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">今月の医療費</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(data.monthly_expense)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">今年の合計</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(data.yearly_expense)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">今月の通院</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {data.monthly_visits}
              <span className="text-sm font-normal text-gray-500 ml-1">件</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 次回の予約 */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-700">次回の予約</h2>
              </div>
              <Link href="/visits" className="text-xs text-indigo-600 flex items-center gap-0.5">
                すべて見る <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {data.upcoming_visits.length === 0 ? (
              <p className="text-sm text-gray-400">予約はありません</p>
            ) : (
              <div className="space-y-2">
                {data.upcoming_visits.map((v) => (
                  <Link
                    key={v.id}
                    href={`/visits/${v.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 text-center">
                      <p className="text-xs text-gray-500">{formatDateShort(v.next_visit_date!)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {v.hospital?.name ?? v.hospital_id}
                      </p>
                      {v.department && <p className="text-xs text-gray-500">{v.department}</p>}
                    </div>
                    {v.next_visit_time && (
                      <p className="text-xs text-gray-500 flex-shrink-0">{v.next_visit_time}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 服薬中の薬 */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-700">服薬中の薬</h2>
              </div>
              <Link href="/medications" className="text-xs text-indigo-600 flex items-center gap-0.5">
                すべて見る <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {data.active_medications.length === 0 ? (
              <p className="text-sm text-gray-400">服薬中の薬はありません</p>
            ) : (
              <div className="space-y-2">
                {data.active_medications.map((m) => {
                  const daysLeft = m.end_date ? getDaysRemaining(m.end_date) : null;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg">
                      <span className="text-lg">💊</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.frequency}</p>
                      </div>
                      {m.is_ongoing ? (
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">常用</span>
                      ) : daysLeft !== null && daysLeft <= 7 ? (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          残り{daysLeft}日
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 最新健診サマリー */}
        {data.latest_checkup && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-700">
                  最新健診（{formatDateShort(data.latest_checkup.checkup_date)}）
                </h2>
              </div>
              <Link
                href={`/checkups/${data.latest_checkup.id}`}
                className="text-xs text-indigo-600 flex items-center gap-0.5"
              >
                詳細を見る <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(data.latest_checkup.checkup_items ?? []).slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{item.item_name}</span>
                  <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                  {item.unit && <span className="text-xs text-gray-400">{item.unit}</span>}
                  {item.judgment && <JudgmentBadge judgment={item.judgment} showLabel={false} size="sm" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近の通院 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">最近の通院</h2>
            <Link href="/visits" className="text-xs text-indigo-600 flex items-center gap-0.5">
              すべて見る <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recent_visits.length === 0 ? (
            <p className="text-sm text-gray-400">通院記録はありません</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recent_visits.map((v) => (
                <Link
                  key={v.id}
                  href={`/visits/${v.id}`}
                  className="flex items-center gap-4 py-3 hover:bg-gray-50 px-2 rounded-lg transition-colors"
                >
                  <p className="text-sm text-gray-500 w-28 flex-shrink-0">{formatDateShort(v.visit_date)}</p>
                  <p className="text-sm font-medium text-gray-900 flex-1 truncate">
                    {v.hospital?.name ?? ''}
                  </p>
                  {v.medical_expenses && v.medical_expenses.length > 0 && (
                    <p className="text-sm text-gray-600 tabular-nums flex-shrink-0">
                      {formatCurrency(v.medical_expenses.reduce((s, e) => s + (e.total_amount ?? 0), 0))}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
