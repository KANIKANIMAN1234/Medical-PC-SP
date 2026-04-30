'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pause } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { JudgmentBadge } from '@/components/common/JudgmentBadge';
import { createClient } from '@/lib/supabase';
import { formatDate, formatDatetime, getLogLevelColor, getPlanLabel, getRoleLabel } from '@/lib/utils';

export default function AdminOrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-org', id],
    queryFn: async () => {
      const [orgResult, membersResult, logsResult, dataCountResult] = await Promise.all([
        supabase.from('m_organizations').select('*, organization_users(*, user:users(display_name))').eq('id', id).single(),
        supabase.from('m_organization_users').select('*, user:users(id,display_name)').eq('organization_id', id),
        supabase.from('t_system_logs').select('*, user:users(display_name)').eq('organization_id', id).order('created_at', { ascending: false }).limit(10),
        Promise.all([
          supabase.from('t_visits').select('*', { count: 'exact', head: true }).eq('organization_id', id),
          supabase.from('t_medical_expenses').select('*', { count: 'exact', head: true }).eq('organization_id', id),
          supabase.from('t_health_checkups').select('*', { count: 'exact', head: true }).eq('organization_id', id),
        ]),
      ]);

      return {
        org: orgResult.data,
        members: membersResult.data ?? [],
        logs: logsResult.data ?? [],
        counts: {
          visits: dataCountResult[0].count ?? 0,
          expenses: dataCountResult[1].count ?? 0,
          checkups: dataCountResult[2].count ?? 0,
        },
      };
    },
    enabled: !!id,
  });

  if (isLoading) return <AdminLayout title="テナント詳細"><LoadingSpinner className="h-64" /></AdminLayout>;
  if (!data?.org) return <AdminLayout title="テナント詳細"><p className="text-gray-500">テナントが見つかりません</p></AdminLayout>;

  const { org, members, logs, counts } = data;

  return (
    <AdminLayout title={`テナント詳細: ${org.name}`}>
      <div className="max-w-3xl space-y-4">
        <Link href="/admin/organizations" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-4 h-4" /> テナント一覧に戻る
        </Link>

        {/* 基本情報 */}
        <div className="card p-6">
          <h2 className="section-title">基本情報</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">グループID</dt><dd className="font-mono text-xs text-gray-700">{org.id}</dd></div>
            <div><dt className="text-gray-500">グループ名</dt><dd className="font-medium">{org.name}</dd></div>
            <div><dt className="text-gray-500">登録日</dt><dd>{formatDate(org.created_at)}</dd></div>
            <div><dt className="text-gray-500">プラン</dt><dd><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">{getPlanLabel(org.plan)}</span></dd></div>
            <div>
              <dt className="text-gray-500">状態</dt>
              <dd>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${org.status === 'active' ? 'bg-green-100 text-green-700' : org.status === 'trial' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                  {org.status === 'active' ? '有効' : org.status === 'trial' ? 'トライアル' : '解約'}
                </span>
              </dd>
            </div>
            {org.stripe_subscription_id && (
              <div><dt className="text-gray-500">Stripe ID</dt><dd className="font-mono text-xs text-gray-600">{org.stripe_subscription_id}</dd></div>
            )}
          </dl>
        </div>

        {/* メンバー */}
        <div className="card p-6">
          <h2 className="section-title">メンバー（{members.length}名）</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold">
                  {(m.user as { display_name?: string })?.display_name?.charAt(0) ?? '?'}
                </div>
                <span className="text-sm text-gray-900 flex-1">{(m.user as { display_name?: string })?.display_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'owner' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                  {getRoleLabel(m.role)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* データ集計 */}
        <div className="card p-6">
          <h2 className="section-title">利用データ集計</h2>
          <div className="flex gap-8 text-sm">
            <div><span className="text-gray-500">通院記録: </span><span className="font-bold tabular-nums">{counts.visits}件</span></div>
            <div><span className="text-gray-500">医療費: </span><span className="font-bold tabular-nums">{counts.expenses}件</span></div>
            <div><span className="text-gray-500">健診: </span><span className="font-bold tabular-nums">{counts.checkups}件</span></div>
          </div>
        </div>

        {/* 操作ログ */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">操作ログ（直近10件）</h2>
            <Link href={`/admin/logs?org=${id}`} className="text-xs text-indigo-600">全件見る →</Link>
          </div>
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getLogLevelColor(log.level)}`}>{log.level}</span>
                <span className="text-gray-500 flex-shrink-0">{formatDatetime(log.created_at)}</span>
                <span className="text-gray-700 flex-shrink-0">{(log.user as { display_name?: string })?.display_name}</span>
                <span className="text-gray-600 truncate">{log.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SuperAdmin操作 */}
        <div className="card p-6 border-red-200">
          <h2 className="section-title text-red-600">SuperAdmin操作</h2>
          <div className="flex gap-3">
            <button
              className="btn-secondary text-orange-600 hover:bg-orange-50"
              onClick={() => alert('テナント停止（開発中）')}
            >
              <Pause className="w-4 h-4" /> テナントを停止する
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
