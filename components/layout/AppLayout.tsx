"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { useState, useEffect } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// localStorage key
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

/**
 * アプリケーション共通レイアウト
 * - Sidebar（展開・縮小可能）
 * - メインコンテンツのマージンをサイドバー幅に応じて調整
 */
export function AppLayout({ 
  children, 
  className,
}: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // localStorageから初期状態を読み込む
  useEffect(() => {
    const loadSidebarState = () => {
      try {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved) {
          setIsSidebarCollapsed(JSON.parse(saved));
        }
      } catch {
        // 読み込み失敗時はデフォルト（展開）
      }
      setIsMounted(true);
    };

    loadSidebarState();
  }, []);

  // サイドバーの状態を保存
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(newState));
    } catch {
      // 保存失敗時は無視
    }
  };

  // SSRとの不一致を防ぐため、マウント前はデフォルト幅を使用
  const sidebarWidth = isMounted && isSidebarCollapsed ? "72px" : "280px";

  return (
    <div className={cn(
      "min-h-screen bg-white text-gray-900",
      className
    )}>
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isMounted ? isSidebarCollapsed : false}
        onToggle={toggleSidebar}
      />

      {/* Main Content - サイドバー幅分の余白を動的に調整 */}
      <main 
        className="min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
