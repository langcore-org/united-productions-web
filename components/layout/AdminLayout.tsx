"use client";

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
  return (
    <div className={cn("h-screen overflow-hidden bg-white text-gray-900 flex", className)}>
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Main Content - 残りの幅を自動で埋める */}
      <main className="h-screen overflow-y-auto flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
