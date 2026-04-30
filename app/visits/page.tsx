'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useVisits } from '@/hooks/useVisits';
import { formatDate, formatDateShort, formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function VisitsPage() {
  const { data: visits, isLoading, error } = useVisits();
  const [search, setSearch] = useState('');

  const filtered = (visits ?? []).filter((v) =>
    !search ||
    v.hospital?.name?.includes(search) ||
    v.diagnosis?.includes(search) ||
    v.chief_complaint?.includes(search) ||
    v.notes?.includes(search)
  );

  // 月別グループ化
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, v) => {
    const month = format(parseISO(v.visit_date), 'yyyy年M月');
    if (!acc[month]) acc[month] = [];
    acc[month].push(v);
    return acc;
  }, {});

  return (
    <AppLayout
      title="通院記録"
      actions={
        <Link href="/visits/new" className="btn-primary">
          <Plus className="w-4 h-4" /> 追加
        </Link>
      }
    >
      {/* 検索 */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="病院名・診断名・メモで検索"
          className="input pl-9"
        />
      </div>

      {isLoading && <LoadingSpinner className="h-48" label="読み込み中..." />}
      {error && <ErrorMessage message="通院記録の取得に失敗しました" />}

      {!isLoading && Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">通院記録はまだありません</p>
          <Link href="/visits/new" className="mt-4 btn-primary inline-flex">
            最初の記録を追加する
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([month, monthVisits]) => (
          <div key={month}>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">{month}</h2>
            <div className="space-y-2">
              {monthVisits.map((v) => (
                <Link
                  key={v.id}
                  href={`/visits/${v.id}`}
                  className="card p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow transition-all"
                >
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{formatDateShort(v.visit_date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {v.hospital?.name ?? '病院名不明'}
                    </p>
                    {v.department && <span className="text-xs text-gray-500 mr-2">{v.department}</span>}
                    {v.diagnosis && (
                      <p className="text-sm text-gray-600 truncate">{v.diagnosis}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {v.medical_expenses && v.medical_expenses.length > 0 && (
                      <p className="text-sm font-medium text-gray-700 tabular-nums">
                        {formatCurrency(v.medical_expenses.reduce((s, e) => s + (e.total_amount ?? 0), 0))}
                      </p>
                    )}
                    {v.medications && v.medications.length > 0 && (
                      <p className="text-xs text-indigo-600 mt-0.5">💊 処方あり</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
