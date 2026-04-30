'use client';

import { ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDate, getPlanLabel } from '@/lib/utils';

export default function AdminSubscriptionsPage() {
  const supabase = createClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data: orgs } = await supabase
        .from('m_organizations')
        .select('*')
        .is('deleted_at', null)
        .in('plan', ['standard', 'premium']);

      const allOrgs = orgs ?? [];
      const mrr = allOrgs.reduce((s, o) => s + (o.plan === 'standard' ? 980 : 1980), 0);
      const planCounts: Record<string, { count: number; revenue: number }> = {
        free: { count: 0, revenue: 0 },
        standard: { count: 0, revenue: 0 },
        premium: { count: 0, revenue: 0 },
      };

      const { data: allOrgsData } = await supabase.from('m_organizations').select('plan, status').is('deleted_at', null);
      (allOrgsData ?? []).forEach((o) => {
        if (!planCounts[o.plan]) planCounts[o.plan] = { count: 0, revenue: 0 };
        planCounts[o.plan].count += 1;
        planCounts[o.plan].revenue += o.plan === 'standard' ? 980 : o.plan === 'premium' ? 1980 : 0;
      });

      return { orgs: allOrgs, mrr, planCounts };
    },
  });

  return (
    <AdminLayout title="サブスク管理">
      {isLoading && <LoadingSpinner className="h-48" />}

      {data && (
        <div className="max-w-4xl space-y-6">
          {/* 売上サマリー */}
          <div className="card p-6">
            <h2 className="section-title">売上サマリー</h2>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-xs text-gray-500">今月のMRR</p>
                <p className="text-3xl font-bold tabular-nums text-gray-900">{formatCurrency(data.mrr)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ARR換算</p>
                <p className="text-xl font-bold tabular-nums text-gray-700">{formatCurrency(data.mrr * 12)}</p>
              </div>
            </div>
          </div>

          {/* プラン内訳 */}
          <div className="card p-6">
            <h2 className="section-title">プラン別内訳</h2>
            <div className="space-y-3">
              {Object.entries(data.planCounts).map(([plan, stats]) => (
                <div key={plan} className="flex items-center gap-4">
                  <span className="text-sm text-gray-700 w-28">{getPlanLabel(plan)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${plan === 'premium' ? 'bg-purple-500' : plan === 'standard' ? 'bg-indigo-500' : 'bg-gray-300'}`}
                      style={{ width: `${Math.min((stats.count / 50) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium tabular-nums w-16 text-right">{stats.count}テナント</span>
                  <span className="text-sm text-gray-500 tabular-nums w-24 text-right">{formatCurrency(stats.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* テナント別サブスク */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">サブスク有効テナント</h2>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs py-1 px-3"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Stripe管理画面
              </a>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">テナント</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">プラン</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">金額</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${org.plan === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {getPlanLabel(org.plan)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(org.plan === 'standard' ? 980 : 1980)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">有効</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
