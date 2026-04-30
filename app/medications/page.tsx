'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useMedications, useCreateMedication, useDeleteMedication } from '@/hooks/useMedications';
import { useMembers } from '@/hooks/useMembers';
import { formatDate, getDaysRemaining } from '@/lib/utils';

export default function MedicationsPage() {
  const { data: medications = [], isLoading } = useMedications();
  const { data: members = [] } = useMembers();
  const { mutateAsync: createMedication } = useCreateMedication();
  const { mutateAsync: deleteMedication } = useDeleteMedication();

  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [form, setForm] = useState({
    member_id: '',
    name: '',
    dosage: '',
    frequency: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_ongoing: false,
    notes: '',
  });

  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const today = new Date().toISOString().split('T')[0];
  const active = medications.filter((m) => m.is_ongoing || (m.end_date ?? '') >= today);
  const displayed = activeTab === 'active' ? active : medications;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMedication(form);
    setShowForm(false);
    setForm({ member_id: '', name: '', dosage: '', frequency: '', start_date: today, end_date: '', is_ongoing: false, notes: '' });
  };

  return (
    <AppLayout
      title="お薬手帳"
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> 追加
        </button>
      }
    >
      {/* タブ */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(['active', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'active' ? `服薬中 (${active.length})` : `全履歴 (${medications.length})`}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSpinner className="h-48" />}

      {!isLoading && displayed.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💊</p>
          <p className="text-sm">薬の記録はありません</p>
        </div>
      )}

      <div className="grid gap-3 max-w-3xl">
        {displayed.map((m) => {
          const daysLeft = !m.is_ongoing && m.end_date ? getDaysRemaining(m.end_date) : null;
          const isActive = m.is_ongoing || (m.end_date ?? '') >= today;
          return (
            <div key={m.id} className={`card p-4 flex items-center gap-4 ${!isActive ? 'opacity-60' : ''}`}>
              <span className="text-2xl">💊</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  {m.member && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{m.member.name}</span>}
                  {m.is_ongoing && (
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">常用</span>
                  )}
                  {!isActive && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">服薬終了</span>
                  )}
                  {daysLeft !== null && daysLeft > 0 && daysLeft <= 7 && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      残り{daysLeft}日
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                  {m.start_date && ` · ${formatDate(m.start_date, 'yyyy/M/d')}〜`}
                  {m.end_date && formatDate(m.end_date, 'yyyy/M/d')}
                </p>
              </div>
              <button
                onClick={() => setDeleteId(m.id)}
                className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
              >
                削除
              </button>
            </div>
          );
        })}
      </div>

      {/* 追加フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-gray-900 mb-4">薬を追加</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">受診者 *</label>
                <select value={form.member_id} onChange={(e) => set('member_id', e.target.value)} className="input" required>
                  <option value="">選択</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">薬品名 *</label>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input" required placeholder="例: アムロジピン 5mg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">用量</label>
                  <input type="text" value={form.dosage} onChange={(e) => set('dosage', e.target.value)} className="input" placeholder="例: 1錠" />
                </div>
                <div>
                  <label className="label">服用タイミング</label>
                  <input type="text" value={form.frequency} onChange={(e) => set('frequency', e.target.value)} className="input" placeholder="例: 毎朝" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">開始日</label>
                  <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">終了日</label>
                  <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className="input" disabled={form.is_ongoing} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_ongoing} onChange={(e) => set('is_ongoing', e.target.checked)} className="rounded" />
                常用薬（終了日なし）
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">キャンセル</button>
                <button type="submit" className="btn-primary flex-1">保存する</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="薬を削除"
        description="この薬の記録を削除しますか？"
        confirmLabel="削除する"
        danger
        onConfirm={async () => { if (deleteId) { await deleteMedication(deleteId); setDeleteId(null); } }}
        onCancel={() => setDeleteId(null)}
      />
    </AppLayout>
  );
}
