'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { JudgmentBadge } from '@/components/common/JudgmentBadge';
import { useCheckup } from '@/hooks/useCheckups';
import { formatDate } from '@/lib/utils';

export default function CheckupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: checkup, isLoading } = useCheckup(id);

  if (isLoading) return <AppLayout><LoadingSpinner className="h-64" /></AppLayout>;
  if (!checkup) return <AppLayout><p className="text-gray-500">記録が見つかりません</p></AppLayout>;

  return (
    <AppLayout title="健診詳細">
      <div className="max-w-3xl space-y-4">
        <Link href="/checkups" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-4 h-4" /> 一覧に戻る
        </Link>

        {/* 基本情報 */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{formatDate(checkup.checkup_date)}</h2>
              <p className="text-sm text-gray-500">{checkup.facility_name}</p>
            </div>
            {checkup.overall_judgment && (
              <JudgmentBadge judgment={checkup.overall_judgment} />
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {checkup.member && <span>受診者: {checkup.member.name}</span>}
            {checkup.checkup_type && <span className="bg-gray-100 px-2 py-0.5 rounded">{checkup.checkup_type}</span>}
          </div>
        </div>

        {/* 数値テーブル */}
        {checkup.checkup_items && checkup.checkup_items.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">検査結果</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">項目</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">数値</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500">単位</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500">基準値</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500">判定</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checkup.checkup_items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{item.item_name}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold">
                      {item.value ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500">{item.unit ?? '-'}</td>
                    <td className="px-5 py-3 text-center text-gray-400 text-xs">{item.reference_range ?? '-'}</td>
                    <td className="px-5 py-3 text-center">
                      {item.judgment ? <JudgmentBadge judgment={item.judgment} size="sm" /> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/checkups/trends" className="btn-secondary">
            トレンドグラフを見る
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
