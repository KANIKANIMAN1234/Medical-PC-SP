import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser, Organization, UserRole } from '@/types/app';

interface AppState {
  // 認証情報
  user: AppUser | null;
  isSuperAdmin: boolean;
  // 現在のグループ
  currentOrganization: Organization | null;
  currentRole: UserRole | null;
  // 所属グループ一覧
  organizations: Organization[];
  // 選択中の患者メンバー
  selectedMemberId: string | null;
  selectedMemberName: string | null;

  // Actions
  setUser: (user: AppUser | null) => void;
  setCurrentOrganization: (org: Organization | null, role: UserRole | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setSelectedMember: (member: { id: string; name: string } | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isSuperAdmin: false,
      currentOrganization: null,
      currentRole: null,
      organizations: [],
      selectedMemberId: null,
      selectedMemberName: null,

      setUser: (user) =>
        set({
          user,
          isSuperAdmin: user?.is_superadmin ?? false,
        }),

      setCurrentOrganization: (org, role) =>
        set({
          currentOrganization: org,
          currentRole: role,
          selectedMemberId: null,
          selectedMemberName: null,
        }),

      setOrganizations: (orgs) => set({ organizations: orgs }),

      setSelectedMember: (member) =>
        set({
          selectedMemberId: member?.id ?? null,
          selectedMemberName: member?.name ?? null,
        }),

      logout: () =>
        set({
          user: null,
          isSuperAdmin: false,
          currentOrganization: null,
          currentRole: null,
          organizations: [],
          selectedMemberId: null,
          selectedMemberName: null,
        }),
    }),
    {
      name: 'kusuri-app-store',
      partialize: (state) => ({
        user: state.user,
        isSuperAdmin: state.isSuperAdmin,
        currentOrganization: state.currentOrganization,
        currentRole: state.currentRole,
        selectedMemberId: state.selectedMemberId,
        selectedMemberName: state.selectedMemberName,
      }),
    }
  )
);
