"use client";

import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Search,
  FileText,
  Lightbulb,
  Mic,
  LogOut,
  History,
  Users,
  MapPin,
  Info,
  Shield,
  ChevronRight,
  ChevronDown,
  Trash2,
  PanelLeft,
  Loader2,
} from "lucide-react";
import { TeddyIcon } from "@/components/icons/TeddyIcon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";


interface SidebarProps {
  className?: string;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

interface ChatHistory {
  id: string;
  featureId: string;
  title: string;
  agentType: string;
  updatedAt: string;
  messageCount: number;
}

// ナビゲーション項目
const navItems = [
  {
    icon: <MessageSquare className="w-[18px] h-[18px]" />,
    label: "チャット",
    href: "/chat",
  },
  {
    icon: <Search className="w-[18px] h-[18px]" />,
    label: "リサーチ",
    href: "/chat?gem=research-cast",
    hasSubmenu: true,
    submenuItems: [
      { icon: <Users className="w-4 h-4" />, label: "出演者リサーチ", href: "/chat?gem=research-cast" },
      { icon: <MapPin className="w-4 h-4" />, label: "場所リサーチ", href: "/chat?gem=research-location" },
      { icon: <Info className="w-4 h-4" />, label: "情報リサーチ", href: "/chat?gem=research-info" },
      { icon: <Shield className="w-4 h-4" />, label: "エビデンスリサーチ", href: "/chat?gem=research-evidence" },
    ],
  },
  {
    icon: <FileText className="w-[18px] h-[18px]" />,
    label: "議事録作成",
    href: "/chat?gem=minutes",
  },
  {
    icon: <Lightbulb className="w-[18px] h-[18px]" />,
    label: "新企画立案",
    href: "/chat?gem=proposal",
  },
  {
    icon: <Mic className="w-[18px] h-[18px]" />,
    label: "NA原稿作成",
    href: "/chat?gem=na-script",
  },
];

// 相対時間を計算
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "今";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`;
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export function Sidebar({ className, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // 履歴関連の状態
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

    try {
      const saved = localStorage.getItem("sidebar-expanded-menus");
      if (saved) {
        setExpandedMenus(new Set(JSON.parse(saved)));
      }
    } catch {
      // 読み込み失敗時はデフォルト
    }
  }, [onCollapseChange]);

  // 履歴を取得
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/chat/history");
      if (!response.ok) {
        throw new Error("履歴の取得に失敗しました");
      }
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 初回マウント時に履歴を取得
  useEffect(() => {
    if (isMounted) {
      fetchHistory();
    }
  }, [isMounted, fetchHistory]);

  // ページ表示時にも履歴を更新
  useEffect(() => {
    if (isMounted) {
      fetchHistory();
    }
  }, [pathname, isMounted, fetchHistory]);

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

  // メニューの開閉状態を保存
  const saveMenuState = (expandedSet: Set<string>) => {
    try {
      localStorage.setItem("sidebar-expanded-menus", JSON.stringify([...expandedSet]));
    } catch {
      // 保存失敗時は無視
    }
  };

  const toggleMenu = (label: string) => {
    if (isCollapsed) return;
    const newSet = new Set(expandedMenus);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setExpandedMenus(newSet);
    saveMenuState(newSet);
  };

  // 履歴を削除
  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("このチャット履歴を削除しますか？")) return;
    
    try {
      const response = await fetch(`/api/chat/history?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("削除に失敗しました");
      }
      // 削除後に履歴を更新
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
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

  // 子メニューがアクティブか
  const hasActiveChild = (item: typeof navItems[0]) => {
    if (!item.submenuItems) return false;
    return item.submenuItems.some((sub) => isActive(sub.href));
  };

  // SSRとの不一致を防ぐため、マウント前は展開状態でレンダリング
  if (!isMounted) {
    return (
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[240px]",
          "flex flex-col",
          "bg-[#f9f9f9] border-r border-[#e5e5e5]",
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
        "bg-[#f9f9f9] border-r border-[#e5e5e5]",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[64px]" : "w-[240px]",
        className
      )}
    >
      {/* Header */}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#f9f9f9]">
        {/* Main Nav Items */}
        <div className={cn(
          "py-2 space-y-0.5 flex-shrink-0",
          isCollapsed ? "px-1.5" : "px-2"
        )}>
          {navItems.map((item) => {
            const isItemActive = isActive(item.href) || hasActiveChild(item);
            const isExpanded = expandedMenus.has(item.label);

            return (
              <div key={item.label}>
                {item.hasSubmenu ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "flex items-center rounded-xl transition-all duration-200 ease-out",
                        "group relative overflow-hidden",
                        isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "w-full gap-3 px-3 py-2",
                        isItemActive
                          ? "bg-white text-black border border-[#e5e5e5]"
                          : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {isItemActive && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                      )}
                      {isItemActive && isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-black rounded-r-full" />
                      )}
                      <span className={cn(
                        "flex-shrink-0 transition-transform duration-200",
                        isItemActive ? "text-black" : "group-hover:scale-110"
                      )}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="text-sm font-medium flex-1 truncate text-left">
                            {item.label}
                          </span>
                          <span className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Submenu */}
                    {!isCollapsed && isExpanded && item.submenuItems && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#e5e5e5] pl-3">
                        {item.submenuItems.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg",
                              "transition-all duration-200 ease-out",
                              "group",
                              isActive(sub.href)
                                ? "bg-white text-black border border-[#e5e5e5]"
                                : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                            )}
                          >
                            <span className={cn(
                              "flex-shrink-0 transition-transform duration-200",
                              isActive(sub.href) ? "text-black" : "group-hover:scale-110"
                            )}>
                              {sub.icon}
                            </span>
                            <span className="text-sm truncate">{sub.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200 ease-out",
                      "group relative overflow-hidden",
                      isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
                      isActive(item.href)
                        ? "bg-white text-black border border-[#e5e5e5]"
                        : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {isActive(item.href) && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                    )}
                    {isActive(item.href) && isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-black rounded-r-full" />
                    )}
                    <span className={cn(
                      "flex-shrink-0 transition-transform duration-200",
                      isActive(item.href) ? "text-black" : "group-hover:scale-110"
                    )}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-sm font-medium flex-1 truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* History Section */}
        {!isCollapsed && (
          <div className="flex-1 min-h-0 overflow-hidden mt-4">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-3 mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-[#6b7280]" />
                  <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">
                    履歴
                  </span>
                </div>
                {isLoadingHistory && (
                  <Loader2 className="w-3.5 h-3.5 text-[#6b7280] animate-spin" />
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar">
                {historyError ? (
                  <p className="text-xs text-gray-500 px-2">{historyError}</p>
                ) : history.length === 0 && !isLoadingHistory ? (
                  <p className="text-xs text-gray-400 px-2 py-2">履歴がありません</p>
                ) : (
                  <div className="space-y-0.5">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="group relative"
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <Link
                          href={`/chat?gem=${item.featureId}`}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-2 rounded-lg",
                            "text-left text-[13px] text-[#6b7280]",
                            "hover:bg-white hover:text-[#1a1a1a]",
                            "transition-all duration-150 ease-out"
                          )}
                        >
                          <MessageSquare className={cn(
                            "w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150",
                            hoveredItem === item.id ? "text-black" : "text-[#9ca3af]"
                          )} />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{item.title}</span>
                            <span className="text-[10px] text-gray-400">
                              {item.agentType} · {getRelativeTime(item.updatedAt)}
                            </span>
                          </div>
                        </Link>

                        {hoveredItem === item.id && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white rounded-md px-1 shadow-sm border border-[#e5e5e5]">
                            <button 
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                              onClick={(e) => handleDeleteHistory(item.id, e)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Items */}
      <div className={cn(
        "py-2 space-y-0.5 border-t border-[#e5e5e5] flex-shrink-0 bg-[#f9f9f9]",
        isCollapsed ? "px-1.5" : "px-2"
      )}>
        <Link
          href="/logout"
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 ease-out group",
            isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "gap-3 px-3 py-2",
            "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
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
            "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
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

export default Sidebar;
