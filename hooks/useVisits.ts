import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Visit } from '@/types/app';

export function useVisits() {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['visits', orgId, selectedMemberId],
    queryFn: async () => {
      let query = supabase
        .from('t_visits')
        .select('*, member:m_members(id,name), hospital:m_hospitals(id,name), t_medications(*), t_medical_expenses(id,total_amount,payment_date)')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('visit_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useVisit(id: string) {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();

  return useQuery({
    queryKey: ['visits', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t_visits')
        .select('*, member:m_members(*), hospital:m_hospitals(*), t_medications(*), t_medical_expenses(*)')
        .eq('id', id)
        .eq('organization_id', currentOrganization!.id)
        .single();
      if (error) throw error;
      return data as Visit;
    },
    enabled: !!id && !!currentOrganization,
  });
}

export function useCreateVisit() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization } = useAppStore();

  return useMutation({
    mutationFn: async (visitData: Partial<Visit>) => {
      const { data, error } = await supabase
        .from('t_visits')
        .insert({ ...visitData, organization_id: currentOrganization!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateVisit() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Visit> & { id: string }) => {
      const { error } = await supabase.from('t_visits').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['visits', variables.id] });
    },
  });
}

export function useDeleteVisit() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('t_visits')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
