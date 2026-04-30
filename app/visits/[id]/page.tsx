'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useVisit, useDeleteVisit } from '@/hooks/useVisits';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: visit, isLoading } = useVisit(id);
  const { mutateAsync: deleteVisit } = useDeleteVisit();
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    await deleteVisit(id);
    router.push('/visits');
  };

  if (isLoading) return <AppLayout><LoadingSpinner className="h-64" /></AppLayout>;
  if (!visit) return <AppLayout><p className="text-gray-500">記録が見つかりません</p></AppLayout>;

  return (
    <AppLayout
      title="通院記録詳細"
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => setShowDelete(true)}
            className="btn-secondary text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> 削除
          </button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-4">
        <Link href="/visits" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-4 h-4" /> 一覧に戻る
        </Link>

        {/* 基本情報 */}
        <div className="card p-6">
          <h2 className="section-title">基本情報</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">受診日</dt>
              <dd className="font-medium text-gray-900">{formatDate(visit.visit_date)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">受診者</dt>
              <dd className="font-medium text-gray-900">{visit.member?.name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">病院</dt>
              <dd className="font-medium text-gray-900">{visit.hospital?.name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">診療科</dt>
              <dd className="font-medium text-gray-900">{visit.department ?? '-'}</dd>
            </div>
            {visit.doctor_name && (
              <div>
                <dt className="text-gray-500">担当医</dt>
                <dd className="font-medium text-gray-900">{visit.doctor_name}</dd>
              </div>
            )}
            {visit.chief_complaint && (
              <div>
                <dt className="text-gray-500">主訴</dt>
                <dd className="font-medium text-gray-900">{visit.chief_complaint}</dd>
              </div>
            )}
            {visit.diagnosis && (
              <div className="col-span-2">
                <dt className="text-gray-500">診断名</dt>
                <dd className="font-medium text-gray-900">{visit.diagnosis}</dd>
              </div>
            )}
            {visit.next_visit_date && (
              <div>
                <dt className="text-gray-500">次回予約</dt>
                <dd className="font-medium text-indigo-600">
                  {formatDate(visit.next_visit_date)}
                  {visit.next_visit_time && ` ${visit.next_visit_time}`}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* 医療費 */}
        {visit.medical_expenses && visit.medical_expenses.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title">医療費</h2>
            {visit.medical_expenses.map((e) => (
              <div key={e.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{formatDate(e.payment_date)}</span>
                  <span className="text-lg font-bold text-gray-900 tabular-nums">
                    {formatCurrency(e.total_amount)}
                  </span>
                </div>
                {e.breakdown && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    {Object.entries(e.breakdown).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-600">{k}</span>
                        <span className="tabular-nums">{formatCurrency(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {e.is_deductible && (
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    医療費控除対象
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 処方薬 */}
        {visit.medications && visit.medications.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title">処方薬</h2>
            <div className="space-y-2">
              {visit.medications.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">💊</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                      {m.is_ongoing ? ' · 常用' : m.end_date ? ` · ${formatDate(m.end_date)}まで` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メモ */}
        {visit.notes && (
          <div className="card p-6">
            <h2 className="section-title">メモ</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.notes}</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        title="通院記録を削除"
        description="この通院記録を削除しますか？この操作は取り消せません。"
        confirmLabel="削除する"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </AppLayout>
  );
}
