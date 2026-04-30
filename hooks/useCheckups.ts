import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { HealthCheckup, OcrCheckupResult } from '@/types/app';

export function useCheckups() {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['checkups', orgId, selectedMemberId],
    queryFn: async () => {
      let query = supabase
        .from('t_health_checkups')
        .select('*, member:m_members(id,name), t_checkup_items(*)')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('checkup_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);

      const { data, error } = await query;
      if (error) throw error;
      return data as HealthCheckup[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckup(id: string) {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();

  return useQuery({
    queryKey: ['checkups', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t_health_checkups')
        .select('*, member:m_members(*), t_checkup_items(*)')
        .eq('id', id)
        .eq('organization_id', currentOrganization!.id)
        .single();
      if (error) throw error;
      return data as HealthCheckup;
    },
    enabled: !!id && !!currentOrganization,
  });
}

export function useCheckupTrends(itemName: string) {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['checkup-trends', orgId, selectedMemberId, itemName],
    queryFn: async () => {
      let q = supabase
        .from('t_checkup_items')
        .select('value, judgment, health_checkup:t_health_checkups!inner(checkup_date, organization_id, member_id)')
        .eq('item_name', itemName)
        .eq('health_checkup.organization_id', orgId!)
        .order('health_checkup(checkup_date)', { ascending: true });

      if (selectedMemberId) q = q.eq('health_checkup.member_id', selectedMemberId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!itemName,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCheckup() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization } = useAppStore();

  return useMutation({
    mutationFn: async ({
      checkup,
      items,
    }: {
      checkup: Partial<HealthCheckup>;
      items: HealthCheckup['checkup_items'];
    }) => {
      const { data: newCheckup, error } = await supabase
        .from('t_health_checkups')
        .insert({ ...checkup, organization_id: currentOrganization!.id })
        .select()
        .single();
      if (error) throw error;

      if (items && items.length > 0) {
        const { error: itemsError } = await supabase
          .from('t_checkup_items')
          .insert(items.map((item) => ({ ...item, checkup_id: newCheckup.id })));
        if (itemsError) throw itemsError;
      }
      return newCheckup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkups'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useOcrCheckup() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({
      imagesBase64,
    }: {
      imagesBase64: string[];
    }): Promise<OcrCheckupResult> => {
      const { data, error } = await supabase.functions.invoke('ocr-checkup', {
        body: { images_base64: imagesBase64 },
      });
      if (error) throw error;
      return data;
    },
  });
}
