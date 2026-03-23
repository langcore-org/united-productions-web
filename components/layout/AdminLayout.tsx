"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// localStorageから初期値を同期的に取得（SSR対応）
function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
}

/**
 * 管理画面共通レイアウト
 * - AdminSidebar（展開/縮小可能）
 * - 白背景（ライトモード）
 */
export function AdminLayout({ children, className }: AdminLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // マウント時にlocalStorageから状態を読み込む
  useEffect(() => {
    setIsSidebarCollapsed(getInitialCollapsedState());
  }, []);

  return (
    <div className={cn("h-screen overflow-hidden bg-white text-gray-900", className)}>
      {/* Sidebar (fixed positioning) */}
      <AdminSidebar onCollapseChange={setIsSidebarCollapsed} />

      {/* Main Content - サイドバー幅に応じてマージンを調整 */}
      <main
        className={cn(
          "h-screen overflow-y-auto transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "ml-[64px]" : "ml-[240px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
