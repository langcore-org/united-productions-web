"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 管理画面共通レイアウト
 * - AdminSidebar（展開/縮小可能）
 * - 白背景（ライトモード）
 */
export function AdminLayout({ children, className }: AdminLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={cn("h-screen overflow-hidden bg-white text-gray-900", className)}>
      {/* Sidebar (fixed positioning) */}
      <AdminSidebar onCollapseChange={setIsSidebarCollapsed} />

      {/* Main Content - サイドバー幅に応じてマージンを調整 */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "ml-[64px]" : "ml-[240px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
