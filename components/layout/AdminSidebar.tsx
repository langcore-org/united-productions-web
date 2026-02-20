"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  BarChart3,
  Shield,
  ChevronRight,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { TeddyIcon } from "@/components/icons/TeddyIcon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface AdminSidebarProps {
  className?: string;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

// 管理画面ナビゲーション項目
const adminNavItems = [
  {
    icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
    label: "ダッシュボード",
    href: "/admin",
  },
  {
    icon: <Users className="w-[18px] h-[18px]" />,
    label: "ユーザー管理",
    href: "/admin/users",
  },
  {
    icon: <FileText className="w-[18px] h-[18px]" />,
    label: "プロンプト管理",
    href: "/admin/prompts",
  },
  {
    icon: <BarChart3 className="w-[18px] h-[18px]" />,
    label: "使用量統計",
    href: "/admin/usage",
  },
  {
    icon: <Shield className="w-[18px] h-[18px]" />,
    label: "ログ閲覧",
    href: "/admin/logs",
  },
  {
    icon: <Settings className="w-[18px] h-[18px]" />,
    label: "システム設定",
    href: "/admin/settings",
  },
];

export function AdminSidebar({ className, onCollapseChange }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // マウント時にlocalStorageから状態を読み込む
  useEffect(() => {
    setIsMounted(true);
    
    try {
      const savedCollapsed = localStorage.getItem("admin-sidebar-collapsed");
      if (savedCollapsed) {
        const collapsed = JSON.parse(savedCollapsed);
        setIsCollapsed(collapsed);
        onCollapseChange?.(collapsed);
      }
    } catch {
      // 読み込み失敗時はデフォルト
    }
  }, [onCollapseChange]);

  // サイドバー折りたたみ状態を保存
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
    try {
      localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(newState));
    } catch {
      // 保存失敗時は無視
    }
  };

  // アクティブ状態の判定
  const isActive = (href: string) => {
    if (pathname === href) return true;
    // サブページもアクティブにする（/admin/settings/xxx など）
    if (href !== "/admin" && pathname.startsWith(href)) return true;
    return false;
  };

  // SSRとの不一致を防ぐため、マウント前は展開状態でレンダリング
  if (!isMounted) {
    return (
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[240px]",
          "flex flex-col",
          "bg-[#1a1a1a] border-r border-[#333333]",
          className
        )}
      />
    );
  }

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 h-screen",
        "flex flex-col",
        "bg-[#1a1a1a] border-r border-[#333333]",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[64px]" : "w-[240px]",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center h-14 bg-[#1a1a1a]",
        isCollapsed ? "px-2 justify-center" : "px-4"
      )}>
        <div className="flex items-center gap-2">
          <TeddyIcon size={28} variant="filled" className="text-amber-500" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white">Teddy</span>
              <span className="text-[10px] text-gray-400 -mt-1">Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Back to User View Link */}
      <div className={cn(
        "bg-[#1a1a1a] border-b border-[#333333]",
        isCollapsed ? "px-2 py-2" : "px-3 py-2"
      )}>
        <Link
          href="/chat"
          className={cn(
            "flex items-center rounded-lg transition-all duration-200 ease-out group",
            isCollapsed 
              ? "w-10 h-10 justify-center p-0" 
              : "w-full gap-2 px-3 py-2",
            "text-gray-400 hover:text-white hover:bg-[#333333]"
          )}
          title={isCollapsed ? "ユーザー画面へ" : undefined}
        >
          <ChevronRight className={cn(
            "w-4 h-4 transition-transform duration-200",
            isCollapsed ? "rotate-180" : ""
          )} />
          {!isCollapsed && (
            <span className="text-sm">ユーザー画面へ</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#1a1a1a]">
        {/* Main Nav Items */}
        <div className={cn(
          "py-2 space-y-0.5 flex-shrink-0",
          isCollapsed ? "px-1.5" : "px-2"
        )}>
          {adminNavItems.map((item) => {
            const isItemActive = isActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200 ease-out",
                  "group relative overflow-hidden",
                  isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
                  isItemActive
                    ? "bg-amber-600 text-white"
                    : "text-gray-400 hover:bg-[#333333] hover:text-white"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {isItemActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full" />
                )}
                {isItemActive && isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-amber-400 rounded-r-full" />
                )}
                <span className={cn(
                  "flex-shrink-0 transition-transform duration-200",
                  isItemActive ? "text-white" : "group-hover:scale-110"
                )}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="text-sm font-medium flex-1 truncate">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Items */}
      <div className={cn(
        "py-2 space-y-0.5 border-t border-[#333333] flex-shrink-0 bg-[#1a1a1a]",
        isCollapsed ? "px-1.5" : "px-2"
      )}>
        <Link
          href="/logout"
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 ease-out group",
            isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
            "text-gray-400 hover:bg-[#333333] hover:text-white"
          )}
          title={isCollapsed ? "ログアウト" : undefined}
        >
          <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            <LogOut className="w-[18px] h-[18px]" />
          </span>
          {!isCollapsed && (
            <span className="text-sm font-medium">ログアウト</span>
          )}
        </Link>

        {/* 展開/縮小ボタン */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 ease-out group",
            isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
            "text-gray-400 hover:bg-[#333333] hover:text-white"
          )}
          title={isCollapsed ? "サイドバーを展開" : "サイドバーを縮小"}
        >
          <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            <PanelLeft className={cn(
              "w-[18px] h-[18px] transition-transform duration-200",
              isCollapsed ? "" : "rotate-180"
            )} />
          </span>
          {!isCollapsed && (
            <span className="text-sm font-medium">サイドバーを縮小</span>
          )}
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
