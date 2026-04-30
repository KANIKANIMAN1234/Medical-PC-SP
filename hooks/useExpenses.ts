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
      memberId,
    }: {
      imageBase64: string;
      memberId: string;
    }): Promise<OcrReceiptResult> => {
      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
        body: { image_base64: imageBase64, member_id: memberId },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadImage() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({
      imageBase64,
      folder,
    }: {
      imageBase64: string;
      folder: string;
    }): Promise<{ url: string; fileId: string }> => {
      const { data, error } = await supabase.functions.invoke('upload-image', {
        body: { image_base64: imageBase64, folder },
      });
      if (error) throw error;
      return data;
    },
  });
}
