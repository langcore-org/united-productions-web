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
      {/* Sidebar (fixed positioning) */}
      <Sidebar onCollapseChange={setIsSidebarCollapsed} />

      {/* Main Content - サイドバー幅に応じてマージンを調整、h-screen で高さを確定させる */}
      <main
        className={cn(
          "h-screen overflow-hidden transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "ml-[64px]" : "ml-[240px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
