'use client';

import Link from 'next/link';
import { Users, Building2, Bell, CreditCard, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppStore } from '@/stores/appStore';
import { getPlanLabel } from '@/lib/utils';

export default function SettingsPage() {
  const { user, currentOrganization, currentRole } = useAppStore();

  const settingsItems = [
    {
      href: '/settings/members',
      icon: Users,
      label: '家族メンバー管理',
      description: '管理対象の家族メンバーを追加・編集',
      show: true,
    },
    {
      href: '/settings/organization',
      icon: Building2,
      label: 'グループ設定',
      description: 'グループ名・メンバー権限・招待',
      show: currentRole === 'owner',
    },
    {
      href: '/settings/subscription',
      icon: CreditCard,
      label: 'サブスクリプション',
      description: 'プラン確認・変更・請求履歴',
      show: currentRole === 'owner',
    },
    {
      href: '/settings/notifications',
      icon: Bell,
      label: '通知設定',
      description: 'LINE通知のON/OFF',
      show: true,
    },
  ].filter((i) => i.show);

  return (
    <AppLayout title="設定">
      <div className="max-w-lg space-y-6">
        {/* プロフィール */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
            {user?.display_name?.charAt(0) ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.display_name}</p>
            {currentOrganization && (
              <p className="text-sm text-gray-500">
                {currentOrganization.name} · {getPlanLabel(currentOrganization.plan)}プラン
              </p>
            )}
          </div>
        </div>

        {/* 設定メニュー */}
        <div className="card divide-y divide-gray-100">
          {settingsItems.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>

        {/* アプリ情報 */}
        <div className="text-center text-xs text-gray-400 py-2">
          <p>お薬手帳・通院記録くん v1.0.0</p>
          <p className="mt-1">© 2026 All rights reserved.</p>
        </div>
      </div>
    </AppLayout>
  );
}
