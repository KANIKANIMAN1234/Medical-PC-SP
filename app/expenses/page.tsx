'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Download, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function ExpensesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: expenses = [], isLoading } = useExpenses(year);
  const { mutateAsync: deleteExpense } = useDeleteExpense();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const totalAmount = expenses.reduce((s, e) => s + (e.total_amount ?? 0), 0);
  const deductibleAmount = expenses.filter((e) => e.is_deductible).reduce((s, e) => s + (e.total_amount ?? 0), 0);
  const isDeductible = totalAmount >= 100000;

  // 月別集計
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const monthExpenses = expenses.filter((e) => e.payment_date.startsWith(`${year}-${month}`));
    return {
      month: `${i + 1}月`,
      amount: monthExpenses.reduce((s, e) => s + (e.total_amount ?? 0), 0),
    };
  });

  const exportCSV = () => {
    const rows = [
      ['支払日', '病院名', '種別', '金額', '控除対象'],
      ...expenses.map((e) => [
        e.payment_date,
        e.hospital_name ?? '',
        e.facility_type === 'hospital' ? '病院' : e.facility_type === 'pharmacy' ? '薬局' : 'その他',
        e.total_amount,
        e.is_deductible ? '○' : '×',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `医療費_${year}.csv`;
    a.click();
  };

  return (
    <AppLayout
      title="医療費管理"
      actions={
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4" /> CSV出力
          </button>
          <Link href="/expenses/new" className="btn-primary">
            <Plus className="w-4 h-4" /> 領収書を追加
          </Link>
        </div>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* 年選択・サマリー */}
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input w-32"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-gray-500">合計</span>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalAmount)}</p>
            </div>
            {isDeductible && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg text-sm">
                <TrendingUp className="w-4 h-4" />
                医療費控除が利用できます（控除対象: {formatCurrency(deductibleAmount)}）
              </div>
            )}
          </div>
        </div>

        {/* 月別グラフ */}
        <div className="card p-5">
          <h2 className="section-title">月別医療費</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                labelFormatter={(label) => `${year}年${label}`}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 領収書一覧 */}
        {isLoading && <LoadingSpinner className="h-32" />}
        {!isLoading && expenses.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🧾</p>
            <p className="text-sm">領収書の記録はありません</p>
          </div>
        )}
        <div className="card divide-y divide-gray-100">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-4 p-4">
              <div className="w-20 flex-shrink-0">
                <p className="text-sm text-gray-500">{formatDate(e.payment_date, 'M/d')}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{e.hospital_name ?? '-'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {e.facility_type === 'hospital' ? '病院' : e.facility_type === 'pharmacy' ? '薬局' : 'その他'}
                  </span>
                  {e.is_deductible && (
                    <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">控除対象</span>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                {formatCurrency(e.total_amount)}
              </p>
              <button
                onClick={() => setDeleteId(e.id)}
                className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="医療費を削除"
        description="この医療費の記録を削除しますか？"
        confirmLabel="削除する"
        danger
        onConfirm={async () => { if (deleteId) { await deleteExpense(deleteId); setDeleteId(null); } }}
        onCancel={() => setDeleteId(null)}
      />
    </AppLayout>
  );
}
