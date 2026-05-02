import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { MedicalExpense, OcrReceiptResult } from '@/types/app';

export function useExpenses(year?: number) {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;
  const targetYear = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ['expenses', orgId, selectedMemberId, targetYear],
    queryFn: async () => {
      let query = supabase
        .from('t_medical_expenses')
        .select('*, member:m_members(id,name)')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .gte('payment_date', `${targetYear}-01-01`)
        .lte('payment_date', `${targetYear}-12-31`)
        .order('payment_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);

      const { data, error } = await query;
      if (error) throw error;
      return data as MedicalExpense[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useCreateExpense() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<MedicalExpense>) => {
      const { data: result, error } = await supabase
        .from('t_medical_expenses')
        .insert({ ...data, organization_id: currentOrganization!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('t_medical_expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useOcrReceipt() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({
      imageBase64,
      memberId: _memberId,
    }: {
      imageBase64: string;
      memberId: string;
    }): Promise<OcrReceiptResult> => {
      const { data: raw, error } = await supabase.functions.invoke('ocr-receipt', {
        body: { image_base64: imageBase64 },
      });
      if (error) throw error;

      const payload = raw as {
        data?: {
          facility_name?: string;
          expense_date?: string;
          payment_date?: string;
          total_amount?: number | string;
          expense_type?: string;
          items?: Array<{ name?: string; amount?: number }> | Record<string, number>;
          confidence?: number;
        } | null;
        error?: { message?: string; code?: string } | null;
      } | null;

      if (payload?.error != null) {
        const msg =
          typeof payload.error === 'object' && payload.error?.message
            ? payload.error.message
            : String(payload.error);
        throw new Error(msg);
      }

      const inner = payload?.data;
      if (!inner) throw new Error('OCRレスポンスにデータがありません');

      const dateRaw = inner.expense_date ?? inner.payment_date ?? '';
      const payment_date =
        typeof dateRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateRaw) ? dateRaw.slice(0, 10) : undefined;

      let total_amount: number | undefined;
      const ta = inner.total_amount;
      if (typeof ta === 'number' && Number.isFinite(ta)) total_amount = Math.round(ta);
      else if (typeof ta === 'string') {
        const digits = ta.replace(/,/g, '').replace(/[^\d]/g, '');
        if (digits) total_amount = parseInt(digits, 10);
      }

      let facility_type: 'hospital' | 'pharmacy' | 'other' = 'hospital';
      const t = String(inner.expense_type ?? '').toLowerCase();
      if (t === 'pharmacy') facility_type = 'pharmacy';
      else if (t === 'other') facility_type = 'other';
      else if (t.includes('薬')) facility_type = 'pharmacy';
      else if (t.includes('調剤')) facility_type = 'pharmacy';

      let breakdown: Record<string, number> | undefined;
      if (Array.isArray(inner.items)) {
        const rec: Record<string, number> = {};
        for (const row of inner.items) {
          const n = row?.name?.trim();
          const a = typeof row?.amount === 'number' ? row.amount : parseInt(String(row?.amount), 10);
          if (n && Number.isFinite(a)) rec[n] = a;
        }
        if (Object.keys(rec).length) breakdown = rec;
      } else if (inner.items && typeof inner.items === 'object' && !Array.isArray(inner.items)) {
        breakdown = inner.items as Record<string, number>;
      }

      return {
        payment_date,
        hospital_name: inner.facility_name?.trim() || undefined,
        facility_type,
        total_amount,
        breakdown,
        confidence: typeof inner.confidence === 'number' ? inner.confidence : 0.85,
      };
    },
  });
}

export function useUploadImage() {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();

  return useMutation({
    mutationFn: async ({
      imageBase64,
      folder,
      memberId,
    }: {
      imageBase64: string;
      folder: string;
      memberId?: string;
    }): Promise<{ url: string; fileId: string }> => {
      const body: Record<string, unknown> = {
        image_base64: imageBase64,
        folder,
      };
      if (currentOrganization?.id) body.organization_id = currentOrganization.id;
      if (memberId) body.member_id = memberId;

      const { data, error } = await supabase.functions.invoke('upload-image', { body });
      if (error) throw error;

      const res = data as { url?: string; fileId?: string; error?: string } | null;
      if (res && typeof res.error === 'string' && res.error) throw new Error(res.error);
      if (!res?.url || !res?.fileId) {
        throw new Error('アップロードの応答が不正です');
      }
      return { url: res.url, fileId: res.fileId };
    },
  });
}
