'use client';

import { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { createClient } from '@/lib/supabase';
import { formatDatetime, getLogLevelColor } from '@/lib/utils';
import type { SystemLog } from '@/types/app';

export default function AdminLogsPage() {
  const supabase = createClient();
  const [filters, setFilters] = useState({
    level: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', filters, page],
    queryFn: async () => {
      let q = supabase
        .from('system_logs')
        .select('*, user:users(display_name), organization:organizations(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filters.level) q = q.eq('level', filters.level);
      if (filters.action) q = q.ilike('action', `%${filters.action}%`);
      if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');

      const { data, count } = await q;
      return { logs: (data ?? []) as SystemLog[], total: count ?? 0 };
    },
  });

  const exportCSV = () => {
    if (!data?.logs) return;
    const rows = [
      ['日時', 'ユーザー', 'グループ', 'アクション', 'レベル'],
      ...data.logs.map((log) => [
        log.created_at,
        (log.user as { display_name?: string })?.display_name ?? '',
        (log.organization as { name?: string })?.name ?? '',
        log.action,
        log.level,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'system_logs.csv';
    a.click();
  };

  return (
    <AdminLayout
      title="システムログ"
      actions={
        <button onClick={exportCSV} className="btn-secondary">
          <Download className="w-4 h-4" /> CSV出力
        </button>
      }
    >
      {/* フィルタ */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))} className="input w-28">
          <option value="">全レベル</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            placeholder="アクション"
            className="input pl-9 w-48"
          />
        </div>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="input w-36" />
        <span className="self-center text-gray-400 text-sm">〜</span>
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} className="input w-36" />
      </div>

      {isLoading && <LoadingSpinner className="h-48" />}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">日時</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ユーザー</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">グループ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">アクション</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">レベル</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.logs ?? []).map((log) => (
              <tr key={log.id} className={log.level === 'ERROR' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {formatDatetime(log.created_at)}
                </td>
                <td className="px-4 py-2 text-gray-700 text-xs">
                  {(log.user as { display_name?: string })?.display_name ?? '-'}
                </td>
                <td className="px-4 py-2 text-gray-600 text-xs">
                  {(log.organization as { name?: string })?.name ?? '-'}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-800">{log.action}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.logs.length === 0 && !isLoading && (
          <p className="text-center py-8 text-sm text-gray-400">ログはありません</p>
        )}
      </div>

      {/* ページネーション */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-400">全{data?.total ?? 0}件</p>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">前へ</button>
          <span className="text-xs text-gray-500 self-center">{page + 1}ページ</span>
          <button disabled={(page + 1) * PAGE_SIZE >= (data?.total ?? 0)} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">次へ</button>
        </div>
      </div>
    </AdminLayout>
  );
}
