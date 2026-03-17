"use client";

import { useState } from "react";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={cn("h-screen overflow-hidden bg-white text-gray-900", className)}>
      {/* Sidebar - デスクトップのみ固定表示 */}
      <aside className="fixed top-0 left-0 z-40 h-screen hidden md:block">
        <Sidebar onCollapseChange={setIsSidebarCollapsed} />
      </aside>

      {/* Main Content - サイドバー幅に応じてマージンを調整、h-screen で高さを確定させる */}
      <main
        className={cn(
          "h-screen overflow-hidden transition-all duration-300 ease-in-out",
          // デスクトップのみサイドバー分のマージンを適用、モバイルは全幅
          "md:ml-[240px]",
          isSidebarCollapsed && "md:ml-[64px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
