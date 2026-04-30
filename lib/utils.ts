import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, fmt = 'yyyy年M月d日') {
  try {
    return format(parseISO(dateStr), fmt, { locale: ja });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string) {
  return formatDate(dateStr, 'M/d（E）');
}

export function formatCurrency(amount: number) {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export function formatDatetime(dateStr: string) {
  return formatDate(dateStr, 'yyyy年M月d日 HH:mm');
}

export function getDaysRemaining(endDate: string): number {
  const end = parseISO(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getJudgmentLabel(judgment: string): string {
  const labels: Record<string, string> = {
    A: 'A 正常',
    B: 'B 軽度異常',
    C: 'C 要経過観察',
    D: 'D 要精密検査',
    E: 'E 治療中',
  };
  return labels[judgment] ?? judgment;
}

export function getJudgmentColor(judgment: string): string {
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-yellow-100 text-yellow-800',
    C: 'bg-orange-100 text-orange-800',
    D: 'bg-red-100 text-red-800',
    E: 'bg-purple-100 text-purple-800',
  };
  return colors[judgment] ?? 'bg-gray-100 text-gray-800';
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    owner: 'bg-indigo-100 text-indigo-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
    superadmin: 'bg-red-100 text-red-800',
  };
  return colors[role] ?? 'bg-gray-100 text-gray-800';
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: 'オーナー',
    editor: '編集者',
    viewer: '閲覧者',
    superadmin: 'SuperAdmin',
  };
  return labels[role] ?? role;
}

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: 'フリー',
    standard: 'スタンダード',
    premium: 'プレミアム',
  };
  return labels[plan] ?? plan;
}

export function getLogLevelColor(level: string): string {
  const colors: Record<string, string> = {
    INFO: 'text-blue-600 bg-blue-50',
    WARN: 'text-yellow-700 bg-yellow-50',
    ERROR: 'text-red-700 bg-red-50',
  };
  return colors[level] ?? 'text-gray-600 bg-gray-50';
}
