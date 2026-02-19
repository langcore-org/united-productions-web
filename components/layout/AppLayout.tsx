"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * アプリケーション共通レイアウト
 * - Sidebar（常時表示）
 * - ライトモード固定
 */
export function AppLayout({ 
  children, 
  className,
}: AppLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-white text-gray-900",
      className
    )}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content - サイドバー幅分の余白を追加 */}
      <main className="min-h-screen ml-[280px]">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
