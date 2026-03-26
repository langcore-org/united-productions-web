"use client";

import { BarChart3, ChevronRight, FileText, LogOut, PanelLeft, Tv, Users } from "lucide-react";
// import { TeddyIcon } from "@/components/icons/TeddyIcon"; // ロゴは非表示（将来使用予定）
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  className?: string;
}

// 管理画面ナビゲーション項目
const adminNavItems = [
  {
    icon: <Users className="w-[18px] h-[18px]" />,
    label: "ユーザー管理",
    href: "/admin/users",
  },
  {
    icon: <Tv className="w-[18px] h-[18px]" />,
    label: "番組情報管理",
    href: "/admin/programs",
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
];

// localStorageから初期値を同期的に取得（SSR対応）
function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(newState));
    } catch {
      // 保存失敗時は無視
    }
  };

  // アクティブ状態の判定
  const isActive = (href: string) => {
    if (pathname === href) return true;
    // サブページもアクティブにする
    if (pathname.startsWith(href)) return true;
    return false;
  };

  // SSRとの不一致を防ぐため、マウント前は展開状態でレンダリング
  if (!isMounted) {
    return (
      <aside
        className={cn(
          "h-screen w-[240px] flex-shrink-0",
          "flex flex-col",
          "bg-white border-r border-gray-200",
          className,
        )}
      />
    );
  }

  return (
    <aside
      className={cn(
        "h-screen flex-shrink-0",
        "flex flex-col",
        "bg-white border-r border-gray-200",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[64px]" : "w-[240px]",
        className,
      )}
    >
      {/* Header - ロゴ非表示（将来使用予定）
      <div className={cn(
        "flex items-center h-14 bg-white",
        isCollapsed ? "px-2 justify-center" : "px-4"
      )}>
        <div className="flex items-center gap-2">
          <TeddyIcon size={28} variant="filled" className="text-amber-700" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-gray-900">Teddy</span>
              <span className="text-[10px] text-gray-500 -mt-1">Admin</span>
            </div>
          )}
        </div>
      </div>
      */}

      {/* Back to User View Link */}
      <div
        className={cn(
          "bg-gray-50 border-b border-gray-200",
          isCollapsed ? "px-2 py-2" : "px-3 py-2",
        )}
      >
        <Link
          href="/chat"
          className={cn(
            "flex items-center rounded-lg transition-all duration-200 ease-out group",
            isCollapsed ? "w-10 h-10 justify-center p-0" : "w-full gap-2 px-3 py-2",
            "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          )}
          title={isCollapsed ? "ユーザー画面へ" : undefined}
        >
          <ChevronRight
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isCollapsed ? "rotate-180" : "",
            )}
          />
          {!isCollapsed && <span className="text-sm">ユーザー画面へ</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
        {/* Main Nav Items */}
        <div className={cn("py-2 space-y-0.5 flex-shrink-0", isCollapsed ? "px-1.5" : "px-2")}>
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
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {isItemActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-600 rounded-r-full" />
                )}
                {isItemActive && isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-amber-600 rounded-r-full" />
                )}
                <span
                  className={cn(
                    "flex-shrink-0 transition-transform duration-200",
                    isItemActive ? "text-amber-700" : "group-hover:scale-110",
                  )}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Items */}
      <div
        className={cn(
          "py-2 space-y-0.5 border-t border-gray-200 flex-shrink-0 bg-white",
          isCollapsed ? "px-1.5" : "px-2",
        )}
      >
        <Link
          href="/logout"
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 ease-out group",
            isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
            "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
          title={isCollapsed ? "ログアウト" : undefined}
        >
          <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            <LogOut className="w-[18px] h-[18px]" />
          </span>
          {!isCollapsed && <span className="text-sm font-medium">ログアウト</span>}
        </Link>

        {/* 展開/縮小ボタン */}
        <button
          type="button"
          onClick={toggleCollapse}
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 ease-out group",
            isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
            "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
          title={isCollapsed ? "サイドバーを展開" : "サイドバーを縮小"}
        >
          <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            <PanelLeft
              className={cn(
                "w-[18px] h-[18px] transition-transform duration-200",
                isCollapsed ? "" : "rotate-180",
              )}
            />
          </span>
          {!isCollapsed && <span className="text-sm font-medium">サイドバーを縮小</span>}
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
