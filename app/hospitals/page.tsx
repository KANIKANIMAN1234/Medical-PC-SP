'use client';

import { useState } from 'react';
import { Plus, Building2, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useHospitals, useCreateHospital, useDeleteHospital } from '@/hooks/useHospitals';

export default function HospitalsPage() {
  const { data: hospitals = [], isLoading } = useHospitals();
  const { mutateAsync: createHospital } = useCreateHospital();
  const { mutateAsync: deleteHospital } = useDeleteHospital();

  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', department: '', phone: '', address: '', notes: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { department, ...rest } = form;
    await createHospital({
      ...rest,
      departments: department ? [department] : [],
    });
    setShowForm(false);
    setForm({ name: '', department: '', phone: '', address: '', notes: '' });
  };

  return (
    <AppLayout
      title="病院マスタ"
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> 病院を追加
        </button>
      }
    >
      {isLoading && <LoadingSpinner className="h-48" />}
      {!isLoading && hospitals.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">病院・薬局の登録はありません</p>
        </div>
      )}

      <div className="grid gap-3 max-w-2xl">
        {hospitals.map((h) => (
          <div key={h.id} className="card p-4 flex items-center gap-4">
            <Building2 className="w-8 h-8 text-indigo-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{h.name}</p>
              <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                {(h.departments?.length ?? 0) > 0 && <span>{h.departments!.join('・')}</span>}
                {h.phone && <span>📞 {h.phone}</span>}
                {h.address && <span>📍 {h.address}</span>}
              </div>
            </div>
            <button onClick={() => setDeleteId(h.id)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">病院・薬局を追加</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">名前 *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required placeholder="例: 大阪内科クリニック" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">診療科</label>
                  <input type="text" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="input" placeholder="内科" />
                </div>
                <div>
                  <label className="label">電話番号</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" placeholder="06-xxxx-xxxx" />
                </div>
              </div>
              <div>
                <label className="label">住所</label>
                <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">キャンセル</button>
                <button type="submit" className="btn-primary flex-1">追加する</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="病院を削除"
        description="この病院の登録を削除しますか？関連する通院記録は削除されません。"
        confirmLabel="削除する"
        danger
        onConfirm={async () => { if (deleteId) { await deleteHospital(deleteId); setDeleteId(null); } }}
        onCancel={() => setDeleteId(null)}
      />
    </AppLayout>
  );
}
