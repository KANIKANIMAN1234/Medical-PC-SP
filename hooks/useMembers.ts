import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { Member } from '@/types/app';

export function useMembers() {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('is_self', { ascending: false });
      if (error) throw error;
      return data as Member[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateMember() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<Member>) => {
      const { data: result, error } = await supabase
        .from('members')
        .insert({ ...data, organization_id: currentOrganization!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useUpdateMember() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Member> & { id: string }) => {
      const { error } = await supabase.from('members').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useDeleteMember() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}
