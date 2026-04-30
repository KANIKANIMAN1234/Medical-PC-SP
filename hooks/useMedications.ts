import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Medication } from '@/types/app';

export function useMedications(activeOnly = false) {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['medications', orgId, selectedMemberId, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('t_medications')
        .select('*, member:m_members(id,name)')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('start_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);
      if (activeOnly) {
        query = query.or(`is_ongoing.eq.true,end_date.gte.${new Date().toISOString().split('T')[0]}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateMedication() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<Medication>) => {
      const { data: result, error } = await supabase
        .from('t_medications')
        .insert({ ...data, organization_id: currentOrganization!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateMedication() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Medication> & { id: string }) => {
      const { error } = await supabase.from('t_medications').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  });
}

export function useDeleteMedication() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('t_medications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  });
}
