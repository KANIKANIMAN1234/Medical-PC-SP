'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { createClient } from '@/lib/supabase';
import { formatDate, getPlanLabel } from '@/lib/utils';

export default function AdminOrganizationsPage() {
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('*, organization_users(count)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const filtered = orgs.filter((o) => {
    const matchSearch = !search || o.name.includes(search);
    const matchPlan = !planFilter || o.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const exportCSV = () => {
    const rows = [
      ['グループ名', 'プラン', '状態', '登録日'],
      ...filtered.map((o) => [o.name, getPlanLabel(o.plan), o.status, o.created_at?.slice(0, 10)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tenants.csv';
    a.click();
  };

  return (
    <AdminLayout
      title="テナント一覧"
      actions={
        <button onClick={exportCSV} className="btn-secondary">
          <Download className="w-4 h-4" /> CSV出力
        </button>
      }
    >
      {/* フィルタ */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="グループ名で検索"
            className="input pl-9"
          />
        </div>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="input w-36">
          <option value="">プラン: 全て</option>
          <option value="free">フリー</option>
          <option value="standard">スタンダード</option>
          <option value="premium">プレミアム</option>
        </select>
      </div>

      {isLoading && <LoadingSpinner className="h-48" />}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">グループ名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">プラン</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">状態</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">登録日</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    org.plan === 'premium' ? 'bg-purple-100 text-purple-700' :
                    org.plan === 'standard' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getPlanLabel(org.plan)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    org.status === 'active' ? 'bg-green-100 text-green-700' :
                    org.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {org.status === 'active' ? '有効' : org.status === 'trial' ? 'トライアル' : '解約'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(org.created_at, 'yyyy/M/d')}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/organizations/${org.id}`} className="text-xs text-indigo-600 hover:underline">
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !isLoading && (
          <p className="text-center py-8 text-sm text-gray-400">該当するテナントはありません</p>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{filtered.length}件表示</p>
    </AdminLayout>
  );
}
