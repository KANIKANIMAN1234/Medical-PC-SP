'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Pill,
  Receipt,
  Activity,
  Building2,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/visits', label: '通院記録', icon: Calendar },
  { href: '/medications', label: 'お薬手帳', icon: Pill },
  { href: '/expenses', label: '医療費', icon: Receipt },
  { href: '/checkups', label: '健康診断', icon: Activity },
  { href: '/hospitals', label: '病院マスタ', icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    isSuperAdmin,
    currentOrganization,
    currentRole,
    organizations,
    selectedMemberName,
    setCurrentOrganization,
    setSelectedMember,
    logout,
  } = useAppStore();

  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  const handleOrgChange = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org, currentRole);
      setSelectedMember(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* ロゴ・アプリ名 */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">お薬手帳</p>
            <p className="text-xs text-gray-500">通院記録くん</p>
          </div>
        </div>
      </div>

      {/* グループ切替 */}
      {organizations.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100">
          <label className="block text-xs text-gray-500 mb-1">グループ</label>
          {organizations.length > 1 ? (
            <div className="relative">
              <select
                value={currentOrganization?.id ?? ''}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 pr-6 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-800 truncate">
              {currentOrganization?.name ?? '未選択'}
            </p>
          )}
        </div>
      )}

      {/* メンバー切替 */}
      <div className="px-3 py-2 border-b border-gray-100">
        <label className="block text-xs text-gray-500 mb-1">表示メンバー</label>
        <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-indigo-600">
          <span>{selectedMemberName ?? '全員'}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 下部メニュー */}
      <div className="px-2 py-3 border-t border-gray-100 space-y-0.5">
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-red-50 text-red-700'
                : 'text-red-600 hover:bg-red-50'
            )}
          >
            <Shield className="w-4 h-4" />
            管理ダッシュボード
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <Settings className="w-4 h-4" />
          設定
        </Link>
        {(currentRole === 'owner') && (
          <>
            <Link
              href="/settings/organization"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 pl-8"
            >
              グループ設定
            </Link>
            <Link
              href="/settings/subscription"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 pl-8"
            >
              サブスク管理
            </Link>
          </>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>

      {/* ユーザー表示 */}
      {user && (
        <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 truncate">{user.display_name}</p>
          {currentRole && (
            <p className="text-xs text-indigo-600 font-medium">
              {currentRole === 'owner' ? 'オーナー' : currentRole === 'editor' ? '編集者' : '閲覧者'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
