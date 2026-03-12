"use client";

import { ChevronRight, History, LogOut, PanelLeft, Plus } from "lucide-react";
// import { TeddyIcon } from "@/components/icons/TeddyIcon"; // ロゴは非表示（将来使用予定）
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getChatNavigationItems } from "@/lib/chat/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export function Sidebar({ className, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // マウント時にlocalStorageから状態を読み込む
  useEffect(() => {
    setIsMounted(true);

    try {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed");
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
      localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
    } catch {
      // 保存失敗時は無視
    }
  };

  // アクティブ状態の判定
  const isActive = (href: string) => {
    if (pathname === href) return true;
    const pathWithoutQuery = href.split("?")[0];
    if (pathname === pathWithoutQuery && href.includes("?")) {
      return true;
    }
    return false;
  };

  // SSRとの不一致を防ぐため、マウント前は展開状態でレンダリング
  if (!isMounted) {
    return (
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[240px]",
          "flex flex-col",
          "bg-[#f9f9f9] border-r border-[#e5e5e5]",
          className,
        )}
      />
    );
  }

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 h-screen",
        "flex flex-col",
        "bg-[#f9f9f9] border-r border-[#e5e5e5]",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[64px]" : "w-[240px]",
        className,
      )}
    >
      {/* Header - ロゴ非表示（将来使用予定）
      <div className={cn(
        "flex items-center h-14 bg-[#f9f9f9]",
        isCollapsed ? "px-2 justify-center" : "px-4"
      )}>
        <div className="flex items-center gap-2">
          <TeddyIcon size={28} variant="filled" className="text-gray-900" />
          {!isCollapsed && (
            <span className="font-bold text-lg text-[#1a1a1a]">Teddy</span>
          )}
        </div>
      </div>
      */}

      {/* Logo */}
      {!isCollapsed && (
        <div className="px-4 pt-4 pb-2">
          <span className="font-bold text-xl text-[#1a1a1a] tracking-tight">Teddy</span>
        </div>
      )}

      {/* New Chat Buttons */}
      <nav className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-[#f9f9f9] custom-scrollbar">
        {/* Section Title */}
        {!isCollapsed && (
          <div className="px-3 pt-2 pb-2">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">
              新規作成
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className={cn("py-2 space-y-0.5", isCollapsed ? "px-1.5" : "px-2")}>
          {getChatNavigationItems().map((item) => {
            const isItemActive = isActive(item.href);
            const IconComponent = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200 ease-out",
                  "group relative overflow-hidden",
                  isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2.5",
                  isItemActive
                    ? "bg-white text-black border border-[#e5e5e5]"
                    : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {isItemActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                )}
                {isItemActive && isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-black rounded-r-full" />
                )}

                {/* Icon with plus indicator */}
                <div
                  className={cn(
                    "flex-shrink-0 relative",
                    isItemActive
                      ? "text-black"
                      : "group-hover:scale-110 transition-transform duration-200",
                  )}
                >
                  <IconComponent className="w-[18px] h-[18px]" />
                  {!isCollapsed && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full flex items-center justify-center">
                      <Plus className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{item.label}</span>
                    <span className="text-[10px] text-gray-400 block truncate">
                      {item.description}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* History Link */}
        <div className={cn("mt-4 pt-4 border-t border-[#e5e5e5]", isCollapsed ? "px-1.5" : "px-2")}>
          {!isCollapsed && (
            <div className="px-1 pb-2">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">
                履歴
              </span>
            </div>
          )}

          <Link
            href="/chat/history"
            className={cn(
              "flex items-center rounded-xl transition-all duration-200 ease-out",
              "group relative overflow-hidden",
              isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2.5",
              pathname === "/chat/history"
                ? "bg-white text-black border border-[#e5e5e5]"
                : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]",
            )}
            title={isCollapsed ? "履歴" : undefined}
          >
            {pathname === "/chat/history" && !isCollapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
            )}
            {pathname === "/chat/history" && isCollapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-black rounded-r-full" />
            )}
            <span
              className={cn(
                "flex-shrink-0 transition-transform duration-200",
                pathname === "/chat/history" ? "text-black" : "group-hover:scale-110",
              )}
            >
              <History className="w-[18px] h-[18px]" />
            </span>
            {!isCollapsed && (
              <>
                <span className="text-sm font-medium flex-1 truncate">履歴を見る</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </>
            )}
          </Link>
        </div>
      </nav>

      {/* Bottom Items */}
      <div
        className={cn(
          "py-2 space-y-0.5 border-t border-[#e5e5e5] flex-shrink-0 bg-[#f9f9f9]",
          isCollapsed ? "px-1.5" : "px-2",
        )}
      >
        <Link
          href="/logout"
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 ease-out group",
            isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
            "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]",
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
            "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]",
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

export default Sidebar;
