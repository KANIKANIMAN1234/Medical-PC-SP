'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { JudgmentBadge } from '@/components/common/JudgmentBadge';
import { useCheckupTrends } from '@/hooks/useCheckups';

const COMMON_ITEMS = ['LDLコレステロール', '収縮期血圧', 'HbA1c', '体重', 'HDLコレステロール', '空腹時血糖'];

export default function CheckupTrendsPage() {
  const [selectedItems, setSelectedItems] = useState(['LDLコレステロール', '収縮期血圧']);
  const [newItem, setNewItem] = useState('');

  const addItem = (name: string) => {
    if (!selectedItems.includes(name) && name) {
      setSelectedItems((prev) => [...prev, name]);
    }
  };
  const removeItem = (name: string) => setSelectedItems((prev) => prev.filter((i) => i !== name));

  return (
    <AppLayout title="健診トレンド">
      <div className="max-w-4xl space-y-6">
        <Link href="/checkups" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> 一覧に戻る
        </Link>

        {/* 項目選択 */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedItems.map((item) => (
              <span
                key={item}
                className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium"
              >
                {item}
                <button onClick={() => removeItem(item)} className="ml-1 text-indigo-400 hover:text-indigo-700">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {COMMON_ITEMS.filter((i) => !selectedItems.includes(i)).map((item) => (
              <button
                key={item}
                onClick={() => addItem(item)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
              >
                + {item}
              </button>
            ))}
            <div className="flex gap-1">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="その他の項目名"
                className="input py-1 text-sm w-36"
              />
              <button onClick={() => { addItem(newItem); setNewItem(''); }} className="btn-secondary py-1 text-xs">追加</button>
            </div>
          </div>
        </div>

        {/* 各項目のグラフ */}
        {selectedItems.map((itemName) => (
          <TrendChart key={itemName} itemName={itemName} />
        ))}
      </div>
    </AppLayout>
  );
}

function TrendChart({ itemName }: { itemName: string }) {
  const { data, isLoading } = useCheckupTrends(itemName);

  const chartData = (data ?? []).map((d: { health_checkup: { checkup_date: string } | { checkup_date: string }[]; value: number; judgment: string }) => {
    const hc = Array.isArray(d.health_checkup) ? d.health_checkup[0] : d.health_checkup;
    return {
      date: hc?.checkup_date?.slice(0, 7) ?? '',
      value: d.value,
      judgment: d.judgment,
    };
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">{itemName}</h2>
        {chartData.length >= 2 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">
              前回: <span className="tabular-nums font-medium">{chartData[chartData.length - 2]?.value}</span>
            </span>
            <span className="text-gray-700">→</span>
            <span className="font-semibold tabular-nums">{chartData[chartData.length - 1]?.value}</span>
            {chartData.length >= 2 && (
              <span className={
                (chartData[chartData.length - 1]?.value ?? 0) > (chartData[chartData.length - 2]?.value ?? 0)
                  ? 'text-orange-600' : 'text-green-600'
              }>
                ({(chartData[chartData.length - 1]?.value ?? 0) > (chartData[chartData.length - 2]?.value ?? 0) ? '↑' : '↓'}
                {Math.abs((chartData[chartData.length - 1]?.value ?? 0) - (chartData[chartData.length - 2]?.value ?? 0)).toFixed(1)})
              </span>
            )}
            {chartData[chartData.length - 1]?.judgment && (
              <JudgmentBadge judgment={chartData[chartData.length - 1].judgment as 'A' | 'B' | 'C' | 'D' | 'E'} size="sm" />
            )}
          </div>
        )}
      </div>

      {isLoading && <LoadingSpinner size="sm" className="h-24" />}
      {!isLoading && chartData.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">データがありません</p>
      )}
      {!isLoading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, itemName]} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: '#6366f1', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
