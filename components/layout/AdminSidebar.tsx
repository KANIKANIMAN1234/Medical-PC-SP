'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Home,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard, exact: true },
  { href: '/admin/organizations', label: 'テナント一覧', icon: Building2 },
  { href: '/admin/users', label: 'ユーザー管理', icon: Users },
  { href: '/admin/logs', label: 'システムログ', icon: FileText },
  { href: '/admin/subscriptions', label: 'サブスク管理', icon: CreditCard },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAppStore();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  return (
    <div className="flex h-full flex-col bg-gray-900 text-gray-100">
      {/* ロゴ */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-sm font-bold text-white leading-tight">管理ダッシュボード</p>
            <span className="inline-block text-xs bg-red-600 text-white px-1.5 py-0.5 rounded mt-0.5">
              SuperAdmin
            </span>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {adminNavItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 下部メニュー */}
      <div className="px-2 py-3 border-t border-gray-700 space-y-0.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
        >
          <Home className="w-4 h-4" />
          一般画面に戻る
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>

      {user && (
        <div className="px-3 py-3 border-t border-gray-700 bg-gray-800">
          <p className="text-xs text-gray-400 truncate">{user.display_name}</p>
          <p className="text-xs text-red-400 font-medium">SuperAdmin</p>
        </div>
      )}
    </div>
  );
}
