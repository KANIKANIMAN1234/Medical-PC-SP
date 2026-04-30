'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Building2, Users, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAppStore } from '@/stores/appStore';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDatetime, getLogLevelColor, getPlanLabel } from '@/lib/utils';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isSuperAdmin, user } = useAppStore();
  const supabase = createClient();

  useEffect(() => {
    if (!isSuperAdmin) router.push('/dashboard');
  }, [isSuperAdmin, router]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [orgsResult, usersResult, logsResult] = await Promise.all([
        supabase.from('m_organizations').select('*', { count: 'exact' }).is('deleted_at', null),
        supabase.from('m_users').select('*', { count: 'exact' }),
        supabase.from('t_system_logs').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      const orgs = orgsResult.data ?? [];
      const activeOrgs = orgs.filter((o) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(o.created_at) > thirtyDaysAgo || o.status === 'active';
      });

      const planCounts = orgs.reduce<Record<string, number>>((acc, o) => {
        acc[o.plan] = (acc[o.plan] ?? 0) + 1;
        return acc;
      }, {});

      const mrr = orgs.reduce((s, o) => {
        if (o.plan === 'standard') return s + 980;
        if (o.plan === 'premium') return s + 1980;
        return s;
      }, 0);

      // 今月の新規
      const thisMonth = new Date().toISOString().slice(0, 7);
      const newThisMonth = orgs.filter((o) => o.created_at?.startsWith(thisMonth)).length;

      return {
        totalOrgs: orgsResult.count ?? 0,
        activeOrgs: activeOrgs.length,
        totalUsers: usersResult.count ?? 0,
        mrr,
        newThisMonth,
        planCounts,
        recentLogs: logsResult.data ?? [],
        recentOrgs: orgs.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
      };
    },
    enabled: !!isSuperAdmin,
  });

  if (!isSuperAdmin) return null;
  if (isLoading) return <AdminLayout title="管理ダッシュボード"><LoadingSpinner className="h-64" /></AdminLayout>;

  return (
    <AdminLayout title="管理ダッシュボード">
      <div className="max-w-5xl space-y-6">
        {/* KPIカード */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'テナント数', value: stats?.totalOrgs ?? 0, unit: '社', icon: Building2 },
            { label: 'アクティブ', value: stats?.activeOrgs ?? 0, unit: '社', icon: TrendingUp },
            { label: 'MRR', value: formatCurrency(stats?.mrr ?? 0), unit: '', icon: TrendingUp },
            { label: '新規（今月）', value: `+${stats?.newThisMonth ?? 0}`, unit: '社', icon: Users },
          ].map(({ label, value, unit, icon: Icon }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">{label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* プラン別内訳 */}
        <div className="card p-5">
          <h2 className="section-title">プラン別内訳</h2>
          <div className="flex gap-6">
            {['free', 'standard', 'premium'].map((plan) => (
              <div key={plan} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${plan === 'free' ? 'bg-gray-400' : plan === 'standard' ? 'bg-indigo-500' : 'bg-purple-500'}`} />
                <span className="text-sm text-gray-600">{getPlanLabel(plan)}</span>
                <span className="text-sm font-bold tabular-nums">{stats?.planCounts[plan] ?? 0}社</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 新規テナント */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">新規テナント（直近）</h2>
              <Link href="/admin/organizations" className="text-xs text-indigo-600">すべて見る →</Link>
            </div>
            <div className="space-y-2">
              {stats?.recentOrgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/organizations/${org.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold">
                    {org.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{org.name}</p>
                    <p className="text-xs text-gray-400">{org.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{getPlanLabel(org.plan)}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 直近のシステムログ */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">直近のシステムログ</h2>
              <Link href="/admin/logs" className="text-xs text-indigo-600">詳細ログへ →</Link>
            </div>
            <div className="space-y-1.5">
              {stats?.recentLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-gray-600 truncate flex-1">{log.action}</span>
                  <span className="text-gray-400 flex-shrink-0">{log.created_at?.slice(11, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
