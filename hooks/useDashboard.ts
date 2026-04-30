import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { DashboardSummary } from '@/types/app';

export function useDashboard() {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['dashboard', orgId, selectedMemberId],
    queryFn: async (): Promise<DashboardSummary> => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const thisYear = `${today.getFullYear()}`;

      // 今月の医療費
      let expenseMonthQ = supabase.from('t_medical_expenses').select('total_amount')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .gte('payment_date', `${thisMonth}-01`).lte('payment_date', `${thisMonth}-31`);
      if (selectedMemberId) expenseMonthQ = expenseMonthQ.eq('member_id', selectedMemberId);

      // 今年の医療費
      let expenseYearQ = supabase.from('t_medical_expenses').select('total_amount')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .gte('payment_date', `${thisYear}-01-01`).lte('payment_date', `${thisYear}-12-31`);
      if (selectedMemberId) expenseYearQ = expenseYearQ.eq('member_id', selectedMemberId);

      // 今月の通院件数
      let visitsCountQ = supabase.from('t_visits').select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!).is('deleted_at', null)
        .gte('visit_date', `${thisMonth}-01`).lte('visit_date', `${thisMonth}-31`);
      if (selectedMemberId) visitsCountQ = visitsCountQ.eq('member_id', selectedMemberId);

      // 次回の予約
      let upcomingQ = supabase.from('t_visits').select('*, hospital:m_hospitals(name), member:m_members(name)')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .gte('next_visit_date', todayStr).order('next_visit_date').limit(3);
      if (selectedMemberId) upcomingQ = upcomingQ.eq('member_id', selectedMemberId);

      // 服薬中の薬
      let medsQ = supabase.from('t_medications').select('*, member:m_members(name)')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .or(`is_ongoing.eq.true,end_date.gte.${todayStr}`)
        .order('start_date', { ascending: false }).limit(3);
      if (selectedMemberId) medsQ = medsQ.eq('member_id', selectedMemberId);

      // 最新健診
      let checkupQ = supabase.from('t_health_checkups').select('*, t_checkup_items(*), member:m_members(name)')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .order('checkup_date', { ascending: false }).limit(1);
      if (selectedMemberId) checkupQ = checkupQ.eq('member_id', selectedMemberId);

      // 最近の通院
      let recentVisitsQ = supabase.from('t_visits').select('*, hospital:m_hospitals(name), member:m_members(name)')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .order('visit_date', { ascending: false }).limit(3);
      if (selectedMemberId) recentVisitsQ = recentVisitsQ.eq('member_id', selectedMemberId);

      const [expenseMonth, expenseYear, visitsCount, upcoming, meds, checkup, recentVisits] =
        await Promise.all([expenseMonthQ, expenseYearQ, visitsCountQ, upcomingQ, medsQ, checkupQ, recentVisitsQ]);

      const monthlyExpense = ((expenseMonth.data ?? []) as { total_amount: number }[]).reduce(
        (s, e) => s + (e.total_amount ?? 0), 0
      );
      const yearlyExpense = ((expenseYear.data ?? []) as { total_amount: number }[]).reduce(
        (s, e) => s + (e.total_amount ?? 0), 0
      );

      return {
        monthly_expense: monthlyExpense,
        yearly_expense: yearlyExpense,
        monthly_visits: visitsCount.count ?? 0,
        upcoming_visits: (upcoming.data ?? []) as DashboardSummary['upcoming_visits'],
        active_medications: (meds.data ?? []) as DashboardSummary['active_medications'],
        latest_checkup: (checkup.data?.[0] ?? undefined) as DashboardSummary['latest_checkup'],
        recent_visits: (recentVisits.data ?? []) as DashboardSummary['recent_visits'],
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2,
  });
}
