"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// localStorageから初期値を同期的に取得（SSR対応）
function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved !== null ? JSON.parse(saved) : true;
  } catch {
    return true;
  }
}

/**
 * アプリケーション共通レイアウト
 * - Sidebar（展開/縮小可能）
 * - ライトモード固定
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // マウント時にlocalStorageから状態を読み込む
  useEffect(() => {
    setIsSidebarCollapsed(getInitialCollapsedState());
  }, []);

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
