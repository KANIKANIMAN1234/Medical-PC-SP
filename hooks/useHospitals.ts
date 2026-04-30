import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Hospital } from '@/types/app';

export function useHospitals() {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['hospitals', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as Hospital[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateHospital() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<Hospital>) => {
      const { data: result, error } = await supabase
        .from('hospitals')
        .insert({ ...data, organization_id: currentOrganization!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });
}

export function useUpdateHospital() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Hospital> & { id: string }) => {
      const { error } = await supabase.from('hospitals').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });
}

export function useDeleteHospital() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hospitals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });
}
