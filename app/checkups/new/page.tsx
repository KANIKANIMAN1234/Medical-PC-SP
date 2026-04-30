'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Zap, Trash2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useCreateCheckup, useOcrCheckup } from '@/hooks/useCheckups';
import { useMembers } from '@/hooks/useMembers';
import type { JudgmentLevel, OcrCheckupResult } from '@/types/app';

export default function NewCheckupPage() {
  const router = useRouter();
  const { data: members = [] } = useMembers();
  const { mutateAsync: ocrCheckup, isPending: isOcring } = useOcrCheckup();
  const { mutateAsync: createCheckup, isPending: isSaving } = useCreateCheckup();

  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<{ file: File; preview: string; base64: string }[]>([]);
  const [ocrResult, setOcrResult] = useState<OcrCheckupResult | null>(null);
  const [form, setForm] = useState({
    member_id: '',
    checkup_date: new Date().toISOString().split('T')[0],
    checkup_type: '定期健診',
    facility_name: '',
    overall_judgment: '' as JudgmentLevel | '',
  });
  const [items, setItems] = useState<Array<{
    item_name: string; value: string; unit: string; reference_range: string; judgment: JudgmentLevel | '';
  }>>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');

  const addImage = async (file: File) => {
    const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
    const preview = URL.createObjectURL(compressed);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setImages((prev) => [...prev, { file: compressed, preview, base64 }]);
    };
    reader.readAsDataURL(compressed);
  };

  const handleOcr = async () => {
    if (images.length === 0) { setError('画像を追加してください'); return; }
    setError('');
    try {
      const result = await ocrCheckup({ imagesBase64: images.map((i) => i.base64) });
      setOcrResult(result);
      setForm((f) => ({
        ...f,
        facility_name: result.facility_name ?? f.facility_name,
        checkup_date: result.checkup_date ?? f.checkup_date,
        overall_judgment: result.overall_judgment ?? f.overall_judgment,
      }));
      setItems(result.items.map((item) => ({
        item_name: item.item_name,
        value: item.value?.toString() ?? '',
        unit: item.unit ?? '',
        reference_range: item.reference_range ?? '',
        judgment: item.judgment ?? '',
      })));
      setStep(2);
    } catch {
      setError('OCR処理に失敗しました。手動で入力してください。');
      setStep(2);
    }
  };

  const addItem = () => setItems((prev) => [...prev, { item_name: '', value: '', unit: '', reference_range: '', judgment: '' }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCheckup({
        checkup: { ...form, overall_judgment: form.overall_judgment || undefined },
        items: items
          .filter((item) => item.item_name)
          .map((item) => ({
            id: crypto.randomUUID(),
            checkup_id: '',
            item_name: item.item_name,
            value: item.value ? Number(item.value) : undefined,
            unit: item.unit || undefined,
            reference_range: item.reference_range || undefined,
            judgment: (item.judgment as JudgmentLevel) || undefined,
          })),
      });
      router.push('/checkups');
    } catch {
      setError('保存に失敗しました。');
    }
  };

  const JUDGMENTS: JudgmentLevel[] = ['A', 'B', 'C', 'D', 'E'];

  return (
    <AppLayout title="健診結果を登録">
      <div className="max-w-3xl space-y-6">
        {/* STEP 1: 基本情報 + 画像 */}
        {step === 1 && (
          <div className="card p-6 space-y-4">
            <h2 className="section-title">基本情報</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">受診者 *</label>
                <select value={form.member_id} onChange={(e) => setForm((f) => ({ ...f, member_id: e.target.value }))} className="input" required>
                  <option value="">選択</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">受診日 *</label>
                <input type="date" value={form.checkup_date} onChange={(e) => setForm((f) => ({ ...f, checkup_date: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">種別</label>
                <select value={form.checkup_type} onChange={(e) => setForm((f) => ({ ...f, checkup_type: e.target.value }))} className="input">
                  <option>定期健診</option>
                  <option>人間ドック</option>
                  <option>特定健診</option>
                  <option>その他</option>
                </select>
              </div>
            </div>

            <h2 className="section-title mt-4">結果票の写真（複数ページOK）</h2>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.preview} alt={`Page ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                  <button onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-400">追加</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); }} />

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleOcr} disabled={isOcring || images.length === 0} className="btn-primary">
                {isOcring ? <><LoadingSpinner size="sm" /> 読み取り中...</> : <><Zap className="w-4 h-4" /> OCRで読み取る</>}
              </button>
              <button onClick={() => setStep(2)} className="btn-secondary">手動で入力する</button>
            </div>
          </div>
        )}

        {/* STEP 2: 数値入力 */}
        {step === 2 && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="card p-6 space-y-4">
              <h2 className="section-title">受診情報</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">健診機関</label>
                  <input type="text" value={form.facility_name} onChange={(e) => setForm((f) => ({ ...f, facility_name: e.target.value }))} className="input" placeholder="例: ○○健診センター" />
                </div>
                <div>
                  <label className="label">総合判定</label>
                  <select value={form.overall_judgment} onChange={(e) => setForm((f) => ({ ...f, overall_judgment: e.target.value as JudgmentLevel | '' }))} className="input">
                    <option value="">未設定</option>
                    {JUDGMENTS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">検査項目</h2>
                <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:underline">
                  + 項目を追加
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">項目名</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">数値</th>
                    <th className="px-3 py-2 text-center text-xs text-gray-500">単位</th>
                    <th className="px-3 py-2 text-center text-xs text-gray-500">判定</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <input type="text" value={item.item_name} onChange={(e) => updateItem(i, 'item_name', e.target.value)} className="input py-1" placeholder="例: 血圧（収縮期）" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" value={item.value} onChange={(e) => updateItem(i, 'value', e.target.value)} className="input py-1 text-right" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="text" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="input py-1 text-center" placeholder="mmHg" />
                      </td>
                      <td className="px-3 py-1.5">
                        <select value={item.judgment} onChange={(e) => updateItem(i, 'judgment', e.target.value)} className="input py-1">
                          <option value="">-</option>
                          {JUDGMENTS.map((j) => <option key={j} value={j}>{j}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <p className="text-center py-6 text-sm text-gray-400">「+ 項目を追加」から追加してください</p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">キャンセル</button>
              <button type="submit" disabled={isSaving} className="btn-primary flex-1">
                {isSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
