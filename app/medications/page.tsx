'use client';

import { useState, useRef } from 'react';
import { Plus, Camera, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useMedications, useCreateMedication, useDeleteMedication } from '@/hooks/useMedications';
import { useMembers } from '@/hooks/useMembers';
import { formatDate, getDaysRemaining } from '@/lib/utils';
import { createClient } from '@/lib/supabase';

/** Edge Function ocr-medication のHTTPボディ */
type OcrMedicationResponse = {
  data: {
    drug_name?: string;
    dosage?: string;
    frequency?: string;
    days_supply?: number | null;
    purpose?: string;
    prescribed_date?: string | null;
  } | null;
  error: string | null;
};

function toDateInputValue(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return undefined;
}

export default function MedicationsPage() {
  const { data: medications = [], isLoading } = useMedications();
  const { data: members = [] } = useMembers();
  const { mutateAsync: createMedication } = useCreateMedication();
  const { mutateAsync: deleteMedication } = useDeleteMedication();
  const supabase = createClient();

  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    member_id: '',
    name: '',
    dosage: '',
    frequency: '',
    start_date: today,
    end_date: '',
    is_ongoing: false,
    notes: '',
  });

  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const active = medications.filter((m) => m.is_ongoing || (m.end_date ?? '') >= today);
  const displayed = activeTab === 'active' ? active : medications;

  // 画像をBase64に変換
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // data:...;base64, の後の部分のみ
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // 写真アップロード→OCR処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrPreview(URL.createObjectURL(file));
    setOcrLoading(true);

    try {
      const base64 = await toBase64(file);
      const { data: raw, error } = await supabase.functions.invoke<OcrMedicationResponse>('ocr-medication', {
        body: { image_base64: base64 },
      });
      if (error) throw error;

      const payload = raw as OcrMedicationResponse | null;
      if (payload?.error) throw new Error(payload.error);
      const ocr = payload?.data;
      if (!ocr) throw new Error('レスポンスにデータがありません');

      const dateNorm = toDateInputValue(ocr.prescribed_date);

      setForm((f) => {
        const start = dateNorm ?? f.start_date;
        let end = f.end_date;
        if (
          ocr.days_supply != null &&
          Number.isFinite(Number(ocr.days_supply)) &&
          !f.is_ongoing
        ) {
          const d = new Date(`${start}T12:00:00`);
          d.setDate(d.getDate() + Number(ocr.days_supply));
          end = d.toISOString().split('T')[0];
        }
        return {
          ...f,
          name: ocr.drug_name?.trim() || f.name,
          dosage: ocr.dosage?.trim() || f.dosage,
          frequency: ocr.frequency?.trim() || f.frequency,
          start_date: start,
          end_date: end,
          notes: ocr.purpose?.trim() ? `用途: ${ocr.purpose.trim()}` : f.notes,
        };
      });
    } catch (err) {
      console.error('OCR failed:', err);
      alert(`OCR処理に失敗しました。手動で入力してください。\n${err instanceof Error ? err.message : ''}`);
    } finally {
      setOcrLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMedication(form);
    setShowForm(false);
    setOcrPreview(null);
    setForm({ member_id: '', name: '', dosage: '', frequency: '', start_date: today, end_date: '', is_ongoing: false, notes: '' });
  };

  const handleOpenForm = () => {
    setOcrPreview(null);
    setForm({ member_id: '', name: '', dosage: '', frequency: '', start_date: today, end_date: '', is_ongoing: false, notes: '' });
    setShowForm(true);
  };

  return (
    <AppLayout
      title="お薬手帳"
      actions={
        <button onClick={handleOpenForm} className="btn-primary">
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

              {/* 受診者 */}
              <div>
                <label className="label">受診者 *</label>
                <select value={form.member_id} onChange={(e) => set('member_id', e.target.value)} className="input" required>
                  <option value="">選択</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {/* OCR写真アップロード */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 mb-2">📷 薬袋・処方箋・説明書の写真から自動入力</p>
                {ocrPreview && (
                  <div className="mb-3 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ocrPreview} alt="OCR preview" className="w-full max-h-40 object-contain rounded-lg border" />
                    {ocrLoading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="ml-2 text-sm text-indigo-600">読み取り中...</span>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  {ocrPreview ? '別の写真を選択' : '写真を選択'}
                </button>
                {ocrPreview && !ocrLoading && (
                  <p className="text-xs text-green-600 text-center mt-1">✓ 読み取り完了。内容を確認してください。</p>
                )}
              </div>

              {/* 薬品名 */}
              <div>
                <label className="label">薬品名 *</label>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input" required placeholder="例: アムロジピン 5mg" />
              </div>

              {/* 用量・服用タイミング */}
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

              {/* 開始日・終了日 */}
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

              {/* メモ */}
              <div>
                <label className="label">メモ</label>
                <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input" placeholder="用途・副作用など" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">キャンセル</button>
                <button type="submit" disabled={ocrLoading} className="btn-primary flex-1">保存する</button>
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
