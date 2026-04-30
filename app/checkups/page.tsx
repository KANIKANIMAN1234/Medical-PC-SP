'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { JudgmentBadge } from '@/components/common/JudgmentBadge';
import { useCheckups } from '@/hooks/useCheckups';
import { formatDate } from '@/lib/utils';

export default function CheckupsPage() {
  const { data: checkups = [], isLoading } = useCheckups();

  return (
    <AppLayout
      title="健康診断"
      actions={
        <div className="flex gap-2">
          <Link href="/checkups/trends" className="btn-secondary">トレンドグラフ</Link>
          <Link href="/checkups/new" className="btn-primary">
            <Plus className="w-4 h-4" /> 登録
          </Link>
        </div>
      }
    >
      {isLoading && <LoadingSpinner className="h-48" />}
      {!isLoading && checkups.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">健診の記録はありません</p>
          <Link href="/checkups/new" className="mt-4 btn-primary inline-flex">
            最初の健診を登録する
          </Link>
        </div>
      )}
      <div className="grid gap-3 max-w-3xl">
        {checkups.map((c) => (
          <Link
            key={c.id}
            href={`/checkups/${c.id}`}
            className="card p-4 flex items-center gap-4 hover:border-indigo-200 transition-all"
          >
            <div className="flex-shrink-0">
              {c.overall_judgment ? (
                <JudgmentBadge judgment={c.overall_judgment} />
              ) : (
                <span className="text-2xl">📋</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{formatDate(c.checkup_date)}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {c.facility_name && <span className="text-sm text-gray-500">{c.facility_name}</span>}
                {c.checkup_type && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{c.checkup_type}</span>}
                {c.member && <span className="text-xs text-indigo-600">{c.member.name}</span>}
              </div>
            </div>
            <div className="text-sm text-gray-400 flex-shrink-0">
              {c.checkup_items?.length ?? 0}項目
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
