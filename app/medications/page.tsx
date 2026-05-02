'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Camera, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useMedications, useCreateMedication, useDeleteMedication } from '@/hooks/useMedications';
import { useMembers } from '@/hooks/useMembers';
import { formatDate, getDaysRemaining } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import type { Medication } from '@/types/app';

const SLOT_COUNT = 3;

type MedRow = {
  name: string;
  dosage: string;
  frequency: string;
  days_supply: string;
  notes: string;
  is_ongoing: boolean;
};

function emptyRow(): MedRow {
  return {
    name: '',
    dosage: '',
    frequency: '',
    days_supply: '',
    notes: '',
    is_ongoing: false,
  };
}

function initialRows(): MedRow[] {
  return Array.from({ length: SLOT_COUNT }, emptyRow);
}

/** Edge Function ocr-medication のHTTPボディ */
type OcrMedicationResponse = {
  data: {
    items?: Array<{
      drug_name?: string;
      dosage?: string;
      frequency?: string;
      days_supply?: number | null;
      purpose?: string;
    }>;
    prescribed_date?: string | null;
    ocr_raw_text?: string;
  } | null;
  error: string | null;
};

function toDateInputValue(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return undefined;
}

function medDisplayName(m: Medication & { drug_name?: string }) {
  return m.drug_name ?? m.name ?? '';
}

function medStartDate(m: Medication & { prescribed_date?: string }) {
  return m.prescribed_date ?? m.start_date;
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
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [memberId, setMemberId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [rows, setRows] = useState<MedRow[]>(initialRows);

  const updateRow = useCallback((index: number, patch: Partial<MedRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const active = medications.filter((m) => m.is_ongoing || (m.end_date ?? '') >= today);
  const displayed = activeTab === 'active' ? active : medications;

  const filledRowCount = rows.filter((r) => r.name.trim()).length;

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

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

      const items = ocr.items ?? [];
      const dateNorm = toDateInputValue(ocr.prescribed_date);
      if (dateNorm) setStartDate(dateNorm);

      setRows((prev) => {
        const next = prev.map((r) => ({ ...r }));
        for (let i = 0; i < SLOT_COUNT && i < items.length; i++) {
          const it = items[i];
          const purpose = it.purpose?.trim();
          next[i] = {
            ...next[i],
            name: it.drug_name?.trim() || next[i].name,
            dosage: it.dosage?.trim() || next[i].dosage,
            frequency: it.frequency?.trim() || next[i].frequency,
            days_supply:
              it.days_supply != null && Number.isFinite(Number(it.days_supply))
                ? String(Number(it.days_supply))
                : next[i].days_supply,
            notes: purpose ? `用途: ${purpose}` : next[i].notes,
          };
        }
        return next;
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
    if (!memberId || filledRowCount === 0) return;
    setSaving(true);
    try {
      for (const row of rows) {
        if (!row.name.trim()) continue;
        const ds = row.days_supply ? Number(row.days_supply) : undefined;
        let end = '';
        if (ds && !row.is_ongoing) {
          const d = new Date(`${startDate}T12:00:00`);
          d.setDate(d.getDate() + ds);
          end = d.toISOString().split('T')[0];
        }
        await createMedication({
          member_id: memberId,
          drug_name: row.name.trim(),
          prescribed_date: startDate,
          dosage: row.dosage || undefined,
          frequency: row.frequency || undefined,
          days_supply: ds,
          end_date: end || undefined,
          purpose: row.notes?.trim() || undefined,
          is_ongoing: row.is_ongoing,
        } as Partial<Medication> & { drug_name: string; prescribed_date: string });
      }
      setShowForm(false);
      setOcrPreview(null);
      setRows(initialRows());
      setStartDate(today);
      setMemberId('');
    } catch {
      /* noop */
    }
    setSaving(false);
  };

  const handleOpenForm = () => {
    setOcrPreview(null);
    setRows(initialRows());
    setStartDate(today);
    setMemberId('');
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
          const mExt = m as Medication & { drug_name?: string; prescribed_date?: string };
          const label = medDisplayName(mExt);
          const start = medStartDate(mExt);
          const daysLeft = !m.is_ongoing && m.end_date ? getDaysRemaining(m.end_date) : null;
          const isActive = m.is_ongoing || (m.end_date ?? '') >= today;
          return (
            <div key={m.id} className={`card p-4 flex items-center gap-4 ${!isActive ? 'opacity-60' : ''}`}>
              <span className="text-2xl">💊</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{label}</p>
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
                  {start && ` · ${formatDate(start, 'yyyy/M/d')}〜`}
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-gray-900 mb-2">薬を追加（最大{SLOT_COUNT}件）</h2>
            <p className="text-xs text-gray-500 mb-4">薬品名がある行だけ保存されます。写真からは複数薬を自動分配します。</p>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">受診者 *</label>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input" required>
                  <option value="">選択</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">開始日（共通）</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 mb-2">📷 写真から自動入力（最大{SLOT_COUNT}件）</p>
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

              {rows.map((row, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50/90 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-700">お薬 {idx + 1}</p>
                  <div>
                    <label className="label">薬品名 {idx === 0 ? '*' : ''}</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                      className="input"
                      placeholder="例: アムロジピン 5mg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">用量</label>
                      <input
                        type="text"
                        value={row.dosage}
                        onChange={(e) => updateRow(idx, { dosage: e.target.value })}
                        className="input"
                        placeholder="例: 1錠"
                      />
                    </div>
                    <div>
                      <label className="label">服用タイミング</label>
                      <input
                        type="text"
                        value={row.frequency}
                        onChange={(e) => updateRow(idx, { frequency: e.target.value })}
                        className="input"
                        placeholder="例: 毎朝"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">日数</label>
                    <input
                      type="number"
                      value={row.days_supply}
                      onChange={(e) => updateRow(idx, { days_supply: e.target.value })}
                      className="input"
                      placeholder="例: 30"
                      min={1}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.is_ongoing}
                      onChange={(e) => updateRow(idx, { is_ongoing: e.target.checked })}
                      className="rounded"
                    />
                    常用薬（終了日なし）
                  </label>
                  <div>
                    <label className="label">メモ</label>
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateRow(idx, { notes: e.target.value })}
                      className="input"
                      placeholder="用途・副作用など"
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">キャンセル</button>
                <button
                  type="submit"
                  disabled={ocrLoading || saving || !memberId || filledRowCount === 0}
                  className="btn-primary flex-1"
                >
                  {saving ? '保存中...' : filledRowCount > 1 ? `${filledRowCount}件を保存` : '保存する'}
                </button>
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
