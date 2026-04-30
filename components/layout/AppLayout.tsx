import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export function AppLayout({ children, title, actions }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* PC: サイドバー */}
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <Sidebar />
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ページヘッダー */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
