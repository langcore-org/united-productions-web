"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
  Mic,
  Search,
  Settings,
  LogOut,
  History,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  Users,
  MapPin,
  Info,
  Shield,
  Lightbulb,
  FileEdit,
  ChevronDown,
  ChevronRight,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
  children?: NavItem[];
}

interface HistoryItem {
  id: string;
  title: string;
  timestamp: Date;
}

interface HistorySection {
  label: string;
  items: HistoryItem[];
}

const navItems: NavItem[] = [
  {
    icon: <MessageSquare className="w-[18px] h-[18px]" />,
    label: "チャット",
    href: "/chat",
  },
  {
    icon: <Search className="w-[18px] h-[18px]" />,
    label: "リサーチ",
    href: "/research",
    children: [
      {
        icon: <Users className="w-[16px] h-[16px]" />,
        label: "出演者リサーチ",
        href: "/research/cast",
      },
      {
        icon: <MapPin className="w-[16px] h-[16px]" />,
        label: "場所リサーチ",
        href: "/research/location",
      },
      {
        icon: <Info className="w-[16px] h-[16px]" />,
        label: "情報リサーチ",
        href: "/research/info",
      },
      {
        icon: <Shield className="w-[16px] h-[16px]" />,
        label: "エビデンスリサーチ",
        href: "/research/evidence",
      },
    ],
  },
  {
    icon: <FileText className="w-[18px] h-[18px]" />,
    label: "議事録作成",
    href: "/minutes",
  },
  {
    icon: <Lightbulb className="w-[18px] h-[18px]" />,
    label: "新企画立案",
    href: "/proposal",
  },
  {
    icon: <FileEdit className="w-[18px] h-[18px]" />,
    label: "NA原稿作成",
    href: "/na-script",
  },
];

const bottomItems: NavItem[] = [
  {
    icon: <Tv className="w-[18px] h-[18px]" />,
    label: "番組設定",
    href: "/settings/program",
  },
  {
    icon: <Settings className="w-[18px] h-[18px]" />,
    label: "設定",
    href: "/settings",
  },
  {
    icon: <LogOut className="w-[18px] h-[18px]" />,
    label: "ログアウト",
    href: "/logout",
  },
];

// モック履歴データ
const mockHistory: HistorySection[] = [
  {
    label: "今日",
    items: [
      { id: "1", title: "第3回制作会議の議事録作成", timestamp: new Date() },
      { id: "2", title: "ロケ地候補のリサーチ", timestamp: new Date() },
      { id: "3", title: "出演者インタビュー文字起こし", timestamp: new Date() },
    ],
  },
  {
    label: "昨日",
    items: [
      { id: "4", title: "脚本の推敲と修正案", timestamp: new Date(Date.now() - 86400000) },
      { id: "5", title: "予算表の分析", timestamp: new Date(Date.now() - 86400000) },
    ],
  },
  {
    label: "過去7日間",
    items: [
      { id: "6", title: "スタッフスケジュール調整", timestamp: new Date(Date.now() - 3 * 86400000) },
      { id: "7", title: "機材リストの整理", timestamp: new Date(Date.now() - 5 * 86400000) },
      { id: "8", title: "前回収録の反省会メモ", timestamp: new Date(Date.now() - 6 * 86400000) },
    ],
  },
];

// localStorage key
const COLLAPSED_KEY = "sidebar-collapsed-items";

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [hoveredHistoryId, setHoveredHistoryId] = useState<string | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  // localStorageから開閉状態を読み込む
  useEffect(() => {
    const loadCollapsedState = () => {
      try {
        const saved = localStorage.getItem(COLLAPSED_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setCollapsedItems(new Set(parsed));
        }
      } catch {
        // 読み込み失敗時はデフォルト（全展開）
      }
    };
    
    // requestIdleCallbackまたはsetTimeoutで遅延実行
    if (typeof window !== "undefined") {
      const timer = setTimeout(loadCollapsedState, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // 開閉状態をlocalStorageに保存
  const saveCollapsedState = (newSet: Set<string>) => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...newSet]));
    } catch {
      // 保存失敗時は無視
    }
  };

  const toggleCollapsed = (label: string) => {
    const newSet = new Set(collapsedItems);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setCollapsedItems(newSet);
    saveCollapsedState(newSet);
  };

  // アクティブ状態の判定
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== "/" && pathname?.startsWith(href + "/")) return true;
    return false;
  };

  // 親メニューがアクティブかどうか（子要素でアクティブな場合もtrue）
  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    if (item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return false;
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 h-screen w-[280px]",
        "flex flex-col",
        "bg-[#f9f9f9] border-r border-[#e5e5e5]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">UP</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[#1a1a1a] font-semibold text-sm tracking-tight">ADコパイロット</span>
            <span className="text-[#6b7280] text-[10px] truncate">AD Production</span>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pt-3 pb-2 bg-[#f9f9f9]">
        <button
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
            "bg-white hover:bg-[#f0f0f0] border border-[#e5e5e5]",
            "transition-all duration-200 ease-out",
            "group"
          )}
        >
          <div className="w-5 h-5 rounded-md bg-black flex items-center justify-center flex-shrink-0">
            <Plus className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-[#1a1a1a]">新規チャット</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#f9f9f9]">
        {/* Main Nav Items */}
        <div className="px-2 py-2 space-y-0.5 flex-shrink-0">
          {navItems.map((item) => {
            const hasChildren = !!item.children;
            const isItemActive = isParentActive(item);
            const isCollapsed = collapsedItems.has(item.label);

            return (
              <div key={item.href}>
                {/* Parent Item */}
                {hasChildren ? (
                  <button
                    onClick={() => toggleCollapsed(item.label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl",
                      "transition-all duration-200 ease-out",
                      "group relative overflow-hidden",
                      isItemActive
                        ? "bg-white text-black border border-[#e5e5e5]"
                        : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                    )}
                  >
                    {/* Active indicator */}
                    {isItemActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                    )}
                    <span
                      className={cn(
                        "flex-shrink-0 transition-transform duration-200",
                        isItemActive ? "text-black" : "group-hover:scale-110"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate text-left">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 text-black font-medium">
                        {item.badge}
                      </span>
                    )}
                    <span className="flex-shrink-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl",
                      "transition-all duration-200 ease-out",
                      "group relative overflow-hidden",
                      isActive(item.href)
                        ? "bg-white text-black border border-[#e5e5e5]"
                        : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive(item.href) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                    )}
                    <span
                      className={cn(
                        "flex-shrink-0 transition-transform duration-200",
                        isActive(item.href) ? "text-black" : "group-hover:scale-110"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 text-black font-medium">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}

                {/* Child Items */}
                {hasChildren && !isCollapsed && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#e5e5e5] pl-3">
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg",
                          "transition-all duration-200 ease-out",
                          "group",
                          isActive(child.href)
                            ? "bg-white text-black border border-[#e5e5e5]"
                            : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                        )}
                      >
                        <span
                          className={cn(
                            "flex-shrink-0 transition-transform duration-200",
                            isActive(child.href)
                              ? "text-black"
                              : "group-hover:scale-110"
                          )}
                        >
                          {child.icon}
                        </span>
                        <span className="text-sm truncate">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* History Section */}
        <div className="flex-1 min-h-0 overflow-hidden mt-4">
          <div className="h-full flex flex-col">
            {/* History Header */}
            <div className="flex items-center justify-between px-3 mb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#6b7280]" />
                <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">
                  履歴
                </span>
              </div>
            </div>

            {/* History Groups - Scrollable */}
            <div className="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar">
              {mockHistory.map((section) => (
                <div key={section.label}>
                  <div className="px-1.5 mb-1.5">
                    <span className="text-[10px] font-medium text-[#9ca3af]">{section.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative"
                        onMouseEnter={() => setHoveredHistoryId(item.id)}
                        onMouseLeave={() => setHoveredHistoryId(null)}
                      >
                        <button
                          className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg",
                            "text-left text-[13px] text-[#6b7280]",
                            "hover:bg-white hover:text-[#1a1a1a]",
                            "transition-all duration-150 ease-out"
                          )}
                          title={item.title}
                        >
                          <MessageSquare
                            className={cn(
                              "w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150",
                              hoveredHistoryId === item.id ? "text-black" : "text-[#9ca3af]"
                            )}
                          />
                          <span className="truncate flex-1">{item.title}</span>
                        </button>

                        {/* Hover Actions */}
                        <div
                          className={cn(
                            "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
                            "bg-white rounded-md px-1 shadow-sm border border-[#e5e5e5]",
                            "transition-all duration-150",
                            hoveredHistoryId === item.id ? "opacity-100 visible" : "opacity-0 invisible"
                          )}
                        >
                          <button
                            className="p-1 rounded hover:bg-[#f0f0f0] text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
                            title="編集"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-[#f0f0f0] text-[#6b7280] hover:text-red-500 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Items */}
      <div className="py-2 px-2 space-y-0.5 border-t border-[#e5e5e5] flex-shrink-0 bg-[#f9f9f9]">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl",
              "transition-all duration-200 ease-out group",
              isActive(item.href)
                ? "bg-white text-black border border-[#e5e5e5]"
                : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
            )}
          >
            <span
              className={cn(
                "flex-shrink-0 transition-transform duration-200",
                isActive(item.href) ? "text-black" : "group-hover:scale-110"
              )}
            >
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </aside>
  );
}
