'use client';

import { useState } from 'react';
import { Search, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { createClient } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { AppUser } from '@/types/app';

export default function AdminUsersPage() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [confirmUser, setConfirmUser] = useState<{ user: AppUser; action: 'grant' | 'revoke' } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase.from('m_users').select('*, organization_users(organization:organizations(name))').order('created_at', { ascending: false });
      return (data ?? []) as AppUser[];
    },
  });

  const toggleSuperAdmin = useMutation({
    mutationFn: async ({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) => {
      await supabase.from('m_users').update({ is_superadmin: isSuperAdmin }).eq('id', userId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const filtered = users.filter(
    (u) => !search || u.display_name.includes(search) || u.line_uid.includes(search)
  );

  return (
    <AdminLayout title="ユーザー管理">
      <div className="mb-4 flex gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="氏名・LINE UIDで検索"
            className="input pl-9"
          />
        </div>
      </div>

      {isLoading && <LoadingSpinner className="h-48" />}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">氏名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">LINE UID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">所属グループ</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">SuperAdmin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((u) => {
              const orgs = (u as AppUser & { organization_users?: Array<{ organization: { name: string } }> }).organization_users ?? [];
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {u.is_superadmin && <Shield className="w-3.5 h-3.5 text-red-500" />}
                      {u.display_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.line_uid}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {orgs.map((ou) => ou.organization?.name).filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.is_superadmin ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-red-600 font-medium">✅ 付与済み</span>
                        <button
                          onClick={() => setConfirmUser({ user: u, action: 'revoke' })}
                          className="text-xs text-red-400 hover:text-red-600 ml-1"
                        >
                          [解除]
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmUser({ user: u, action: 'grant' })}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        付与する
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at, 'yyyy/M/d')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>SuperAdmin権限は慎重に付与してください。全テナントのデータへのアクセス権が与えられます。</span>
      </div>

      <ConfirmDialog
        open={!!confirmUser}
        title={confirmUser?.action === 'grant' ? 'SuperAdmin権限を付与' : 'SuperAdmin権限を解除'}
        description={
          confirmUser?.action === 'grant'
            ? `${confirmUser.user.display_name} にSuperAdmin権限を付与しますか？全テナントのデータにアクセスできるようになります。`
            : `${confirmUser?.user.display_name} のSuperAdmin権限を解除しますか？`
        }
        confirmLabel={confirmUser?.action === 'grant' ? '付与する' : '解除する'}
        danger
        onConfirm={async () => {
          if (confirmUser) {
            await toggleSuperAdmin.mutateAsync({
              userId: confirmUser.user.id,
              isSuperAdmin: confirmUser.action === 'grant',
            });
            setConfirmUser(null);
          }
        }}
        onCancel={() => setConfirmUser(null)}
      />
    </AdminLayout>
  );
}
