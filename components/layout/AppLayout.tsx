"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * アプリケーション共通レイアウト
 * - Sidebar（展開/縮小可能）
 * - ライトモード固定
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className={cn("h-screen overflow-hidden bg-white text-gray-900 flex", className)}>
      {/* Sidebar - デスクトップのみ表示 */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content - 残りの幅を自動で埋める */}
      <main className="h-screen overflow-hidden flex-1 min-w-0">{children}</main>
    </div>
  );
}

export default AppLayout;
