'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Zap, CheckCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useCreateExpense, useOcrReceipt, useUploadImage } from '@/hooks/useExpenses';
import { useMembers } from '@/hooks/useMembers';
import type { OcrReceiptResult } from '@/types/app';

type Step = 1 | 2 | 3;

export default function NewExpensePage() {
  const router = useRouter();
  const { data: members = [] } = useMembers();
  const { mutateAsync: ocrReceipt, isPending: isOcring } = useOcrReceipt();
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage();
  const { mutateAsync: createExpense, isPending: isSaving } = useCreateExpense();

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [memberId, setMemberId] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrReceiptResult | null>(null);
  const [form, setForm] = useState({
    payment_date: '',
    hospital_name: '',
    facility_type: 'hospital' as 'hospital' | 'pharmacy' | 'other',
    total_amount: 0,
    is_deductible: true,
    notes: '',
  });
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
    const url = URL.createObjectURL(compressed);
    setPreviewUrl(url);
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64((e.target?.result as string).split(',')[1]);
    reader.readAsDataURL(compressed);
  };

  const handleOcr = async () => {
    if (!imageBase64 || !memberId) {
      setError('画像と受診者を選択してください');
      return;
    }
    setError('');
    setStep(2);
    try {
      const result = await ocrReceipt({ imageBase64, memberId });
      setOcrResult(result);
      setForm((f) => ({
        ...f,
        payment_date: result.payment_date ?? f.payment_date,
        hospital_name: result.hospital_name ?? f.hospital_name,
        facility_type: result.facility_type ?? f.facility_type,
        total_amount: result.total_amount ?? f.total_amount,
      }));
      setStep(3);
    } catch {
      setError('OCR処理に失敗しました。手動で入力してください。');
      setStep(3);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let receiptImageUrl: string | undefined;
      let gdriveFileId: string | undefined;
      if (imageBase64) {
        const uploaded = await uploadImage({ imageBase64, folder: 'receipts', memberId });
        receiptImageUrl = uploaded.url;
        gdriveFileId = uploaded.fileId;
      }
      await createExpense({
        member_id: memberId,
        ...form,
        breakdown: ocrResult?.breakdown,
        receipt_image_url: receiptImageUrl,
        gdrive_file_id: gdriveFileId,
      });
      router.push('/expenses');
    } catch {
      setError('保存に失敗しました。');
    }
  };

  return (
    <AppLayout title="領収書を登録">
      <div className="max-w-2xl space-y-6">
        {/* STEP 1: 画像アップロード */}
        <div className={`card p-6 ${step > 1 ? 'opacity-60' : ''}`}>
          <h2 className="section-title flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
            領収書の写真をアップロード
          </h2>

          <div className="mb-4">
            <label className="label">受診者 *</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input max-w-xs">
              <option value="">選択してください</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="プレビュー" className="max-h-48 mx-auto rounded-lg" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">写真をドラッグ&ドロップ</p>
                <p className="text-xs text-gray-400 mt-1">または クリックして選択</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {previewUrl && step === 1 && (
            <button
              onClick={handleOcr}
              disabled={!memberId}
              className="btn-primary mt-4"
            >
              <Zap className="w-4 h-4" /> OCRで読み取る
            </button>
          )}
        </div>

        {/* STEP 2: OCR処理中 */}
        {step === 2 && (
          <div className="card p-6 text-center">
            <LoadingSpinner className="mb-3" label="読み取り中です（10〜15秒）" />
          </div>
        )}

        {/* STEP 3: 確認・修正 */}
        {step === 3 && (
          <div className="card p-6">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">3</span>
              読み取り結果を確認・修正
              {ocrResult && (
                <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> OCR完了（信頼度 {Math.round(ocrResult.confidence * 100)}%）
                </span>
              )}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">支払日 *</label>
                  <input type="date" value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} className="input" required />
                </div>
                <div>
                  <label className="label">種別</label>
                  <select value={form.facility_type} onChange={(e) => setForm((f) => ({ ...f, facility_type: e.target.value as 'hospital' | 'pharmacy' | 'other' }))} className="input">
                    <option value="hospital">病院</option>
                    <option value="pharmacy">薬局</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">病院・薬局名</label>
                <input type="text" value={form.hospital_name} onChange={(e) => setForm((f) => ({ ...f, hospital_name: e.target.value }))} className="input" placeholder="例: 大阪内科クリニック" />
              </div>

              <div>
                <label className="label">合計金額 *</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.total_amount}
                    onChange={(e) => setForm((f) => ({ ...f, total_amount: Number(e.target.value) }))}
                    className="input pl-6"
                    required
                    min={0}
                  />
                  <span className="absolute left-3 top-2.5 text-sm text-gray-500">¥</span>
                </div>
              </div>

              {/* OCR明細 */}
              {ocrResult?.breakdown && Object.keys(ocrResult.breakdown).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">明細（OCR読み取り）</p>
                  {Object.entries(ocrResult.breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-600">{k}</span>
                      <span className="tabular-nums">{formatAmountDisplay(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_deductible} onChange={(e) => setForm((f) => ({ ...f, is_deductible: e.target.checked }))} className="rounded" />
                医療費控除の対象
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">キャンセル</button>
                <button type="submit" disabled={isSaving || isUploading} className="btn-primary flex-1">
                  {isSaving || isUploading ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* フォーム直接入力 */}
        {step === 1 && !previewUrl && (
          <button onClick={() => setStep(3)} className="text-sm text-indigo-600 hover:underline">
            画像なしで手動入力する
          </button>
        )}
      </div>
    </AppLayout>
  );
}

function formatAmountDisplay(v: number) {
  return `¥${v.toLocaleString('ja-JP')}`;
}
