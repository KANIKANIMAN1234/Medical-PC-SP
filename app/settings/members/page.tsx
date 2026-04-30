'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useMembers, useCreateMember, useDeleteMember } from '@/hooks/useMembers';
import { formatDate } from '@/lib/utils';

export default function MembersPage() {
  const { data: members = [], isLoading } = useMembers();
  const { mutateAsync: createMember } = useCreateMember();
  const { mutateAsync: deleteMember } = useDeleteMember();

  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    birth_date: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    blood_type: '',
    is_self: false,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMember({ ...form, gender: form.gender || undefined });
    setShowForm(false);
    setForm({ name: '', birth_date: '', gender: '', blood_type: '', is_self: false });
  };

  return (
    <AppLayout
      title="家族メンバー管理"
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> メンバーを追加
        </button>
      }
    >
      {isLoading && <LoadingSpinner className="h-48" />}

      <div className="grid gap-3 max-w-2xl">
        {members.map((m) => (
          <div key={m.id} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
              {m.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{m.name}</p>
                {m.is_self && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">本人</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                {m.birth_date && <span>{formatDate(m.birth_date)}</span>}
                {m.gender && <span>{m.gender === 'male' ? '男性' : m.gender === 'female' ? '女性' : 'その他'}</span>}
                {m.blood_type && <span>{m.blood_type}型</span>}
              </div>
            </div>
            {!m.is_self && (
              <button onClick={() => setDeleteId(m.id)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">メンバーを追加</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">名前 *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required placeholder="例: 山田 花子" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">生年月日</label>
                  <input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">血液型</label>
                  <select value={form.blood_type} onChange={(e) => setForm((f) => ({ ...f, blood_type: e.target.value }))} className="input">
                    <option value="">不明</option>
                    {['A', 'B', 'O', 'AB'].map((b) => <option key={b} value={b}>{b}型</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">性別</label>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as 'male' | 'female' | 'other' | '' }))} className="input">
                  <option value="">未設定</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_self} onChange={(e) => setForm((f) => ({ ...f, is_self: e.target.checked }))} className="rounded" />
                自分自身（本人）
              </label>
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
        title="メンバーを削除"
        description="このメンバーの記録をすべて削除しますか？この操作は取り消せません。"
        confirmLabel="削除する"
        danger
        onConfirm={async () => { if (deleteId) { await deleteMember(deleteId); setDeleteId(null); } }}
        onCancel={() => setDeleteId(null)}
      />
    </AppLayout>
  );
}
