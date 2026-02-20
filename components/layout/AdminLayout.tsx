"use client";

import { cn } from "@/lib/utils";
import { AdminSidebar } from "./AdminSidebar";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 管理画面共通レイアウト
 * - AdminSidebar（展開/縮小可能）
 * - ダークテーマ固定
 */
export function AdminLayout({ 
  children, 
  className,
}: AdminLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={cn(
      "h-screen overflow-hidden bg-[#0f0f0f] text-gray-100",
      className
    )}>
      {/* Sidebar (fixed positioning) */}
      <AdminSidebar onCollapseChange={setIsSidebarCollapsed} />

      {/* Main Content - サイドバー幅に応じてマージンを調整 */}
      <main
        className={cn(
          "h-screen overflow-hidden transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "ml-[64px]" : "ml-[240px]"
        )}
      >
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
