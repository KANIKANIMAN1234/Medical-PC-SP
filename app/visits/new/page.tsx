'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreateVisit } from '@/hooks/useVisits';
import { useMembers } from '@/hooks/useMembers';
import { useHospitals } from '@/hooks/useHospitals';

export default function NewVisitPage() {
  const router = useRouter();
  const { mutateAsync: createVisit, isPending } = useCreateVisit();
  const { data: members = [] } = useMembers();
  const { data: hospitals = [] } = useHospitals();

  const [form, setForm] = useState({
    member_id: '',
    hospital_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    department: '',
    doctor_name: '',
    chief_complaint: '',
    diagnosis: '',
    next_visit_date: '',
    next_visit_time: '',
    notes: '',
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.member_id || !form.visit_date) {
      setError('受診者と受診日は必須です');
      return;
    }
    setError('');
    try {
      const visit = await createVisit({
        ...form,
        hospital_id: form.hospital_id || undefined,
        next_visit_date: form.next_visit_date || undefined,
        next_visit_time: form.next_visit_time || undefined,
      });
      router.push(`/visits/${visit.id}`);
    } catch (err) {
      setError('保存に失敗しました。');
    }
  };

  return (
    <AppLayout title="通院記録を登録">
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="section-title">基本情報</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">受診者 *</label>
              <select
                value={form.member_id}
                onChange={(e) => set('member_id', e.target.value)}
                className="input"
                required
              >
                <option value="">選択してください</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">受診日 *</label>
              <input
                type="date"
                value={form.visit_date}
                onChange={(e) => set('visit_date', e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">病院・薬局</label>
              <select
                value={form.hospital_id}
                onChange={(e) => set('hospital_id', e.target.value)}
                className="input"
              >
                <option value="">選択してください</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">診療科</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                placeholder="例: 内科"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">担当医</label>
            <input
              type="text"
              value={form.doctor_name}
              onChange={(e) => set('doctor_name', e.target.value)}
              placeholder="例: 田中先生"
              className="input"
            />
          </div>

          <div>
            <label className="label">主訴（症状・理由）</label>
            <input
              type="text"
              value={form.chief_complaint}
              onChange={(e) => set('chief_complaint', e.target.value)}
              placeholder="例: 頭痛・めまい"
              className="input"
            />
          </div>

          <div>
            <label className="label">診断名</label>
            <input
              type="text"
              value={form.diagnosis}
              onChange={(e) => set('diagnosis', e.target.value)}
              placeholder="例: 高血圧症の経過観察"
              className="input"
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="section-title">次回予約</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">次回受診日</label>
              <input
                type="date"
                value={form.next_visit_date}
                onChange={(e) => set('next_visit_date', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">時刻</label>
              <input
                type="time"
                value={form.next_visit_time}
                onChange={(e) => set('next_visit_time', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <label className="label">メモ</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="次回は血液検査あり、など"
            className="input h-24 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            キャンセル
          </button>
          <button type="submit" disabled={isPending} className="btn-primary flex-1">
            {isPending ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
