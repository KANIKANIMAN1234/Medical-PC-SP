'use client';

import { useState } from 'react';
import { Copy, Link2, Shield, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAppStore } from '@/stores/appStore';
import { createClient } from '@/lib/supabase';
import { getRoleLabel, formatDate } from '@/lib/utils';
import type { OrganizationUser, UserRole } from '@/types/app';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function OrganizationSettingsPage() {
  const { currentOrganization, currentRole } = useAppStore();
  const supabase = createClient();
  const qc = useQueryClient();
  const orgId = currentOrganization?.id;

  const [orgName, setOrgName] = useState(currentOrganization?.name ?? '');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');
  const [inviteExpiry, setInviteExpiry] = useState('7');
  const [inviteLink, setInviteLink] = useState('');
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: orgUsers = [] } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('organization_users')
        .select('*, user:users(id,display_name)')
        .eq('organization_id', orgId!);
      return (data ?? []) as OrganizationUser[];
    },
    enabled: !!orgId,
  });

  const updateName = useMutation({
    mutationFn: async () => {
      await supabase.from('organizations').update({ name: orgName }).eq('id', orgId!);
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(inviteExpiry));
      const { data } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: orgId,
          role: inviteRole,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      const link = `${window.location.origin}/invite/${data?.token}`;
      setInviteLink(link);
    },
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      await supabase
        .from('organization_users')
        .delete()
        .eq('organization_id', orgId!)
        .eq('user_id', userId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-users'] }),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (currentRole !== 'owner') {
    return <AppLayout title="グループ設定"><p className="text-gray-500">この操作はオーナーのみ実行できます。</p></AppLayout>;
  }

  return (
    <AppLayout title="グループ設定">
      <div className="max-w-2xl space-y-6">
        {/* グループ名 */}
        <div className="card p-6">
          <h2 className="section-title">グループ情報</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="input flex-1"
              placeholder="グループ名"
            />
            <button
              onClick={() => updateName.mutate()}
              disabled={updateName.isPending}
              className="btn-primary"
            >
              {updateName.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* メンバー一覧 */}
        <div className="card p-6">
          <h2 className="section-title">メンバー一覧</h2>
          <div className="space-y-2">
            {orgUsers.map((ou) => (
              <div key={ou.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm flex-shrink-0">
                  {(ou.user as { display_name?: string })?.display_name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{(ou.user as { display_name?: string })?.display_name ?? '不明'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ou.role === 'owner' ? 'bg-indigo-100 text-indigo-700' :
                  ou.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {getRoleLabel(ou.role)}
                </span>
                {ou.role !== 'owner' && (
                  <button
                    onClick={() => setRemoveUserId((ou.user as { id: string })?.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 招待リンク発行 */}
        <div className="card p-6">
          <h2 className="section-title">招待リンクを発行</h2>
          <div className="flex gap-3 mb-3">
            <div>
              <label className="label">権限</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className="input">
                <option value="editor">編集者</option>
                <option value="viewer">閲覧者</option>
              </select>
            </div>
            <div>
              <label className="label">有効期限</label>
              <select value={inviteExpiry} onChange={(e) => setInviteExpiry(e.target.value)} className="input">
                <option value="3">3日間</option>
                <option value="7">7日間</option>
                <option value="30">30日間</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => createInvite.mutate()}
            disabled={createInvite.isPending}
            className="btn-secondary"
          >
            <Link2 className="w-4 h-4" />
            {createInvite.isPending ? '生成中...' : '招待リンクを発行'}
          </button>

          {inviteLink && (
            <div className="mt-3 flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
              <p className="text-xs text-indigo-800 flex-1 truncate">{inviteLink}</p>
              <button onClick={copyLink} className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'コピー済み!' : 'コピー'}
              </button>
            </div>
          )}
        </div>

        {/* 危険ゾーン */}
        <div className="card p-6 border-red-200">
          <h2 className="section-title text-red-600">危険ゾーン</h2>
          <p className="text-sm text-gray-500 mb-3">
            グループを解散すると、すべてのデータが完全に削除されます。この操作は取り消せません。
          </p>
          <button className="btn-danger text-sm">
            <Trash2 className="w-4 h-4" /> グループを解散する
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!removeUserId}
        title="メンバーを削除"
        description="このメンバーをグループから削除しますか？"
        confirmLabel="削除する"
        danger
        onConfirm={async () => { if (removeUserId) { await removeUser.mutateAsync(removeUserId); setRemoveUserId(null); } }}
        onCancel={() => setRemoveUserId(null)}
      />
    </AppLayout>
  );
}
