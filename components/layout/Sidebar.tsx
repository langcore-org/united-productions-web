"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
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
  PanelLeft,
  PanelLeftClose,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
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
        label: "出演者",
        href: "/research/cast",
      },
      {
        icon: <MapPin className="w-[16px] h-[16px]" />,
        label: "場所",
        href: "/research/location",
      },
      {
        icon: <Info className="w-[16px] h-[16px]" />,
        label: "情報",
        href: "/research/info",
      },
      {
        icon: <Shield className="w-[16px] h-[16px]" />,
        label: "エビデンス",
        href: "/research/evidence",
      },
    ],
  },
  {
    icon: <FileText className="w-[18px] h-[18px]" />,
    label: "議事録",
    href: "/minutes",
  },
  {
    icon: <Lightbulb className="w-[18px] h-[18px]" />,
    label: "新企画",
    href: "/proposal",
  },
  {
    icon: <FileEdit className="w-[18px] h-[18px]" />,
    label: "NA原稿",
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
    icon: <ShieldCheck className="w-[18px] h-[18px]" />,
    label: "管理画面",
    href: "/admin/settings",
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
      { id: "1", title: "制作会議の議事録", timestamp: new Date() },
      { id: "2", title: "ロケ地リサーチ", timestamp: new Date() },
      { id: "3", title: "出演者リサーチ", timestamp: new Date() },
    ],
  },
  {
    label: "昨日",
    items: [
      { id: "4", title: "脚本の推敲", timestamp: new Date(Date.now() - 86400000) },
      { id: "5", title: "予算表分析", timestamp: new Date(Date.now() - 86400000) },
    ],
  },
];

// localStorage keys
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const MENU_COLLAPSED_KEY = "sidebar-menu-collapsed";

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [hoveredHistoryId, setHoveredHistoryId] = useState<string | null>(null);
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // localStorageからメニューの開閉状態を読み込む
  useEffect(() => {
    const loadMenuState = () => {
      try {
        const saved = localStorage.getItem(MENU_COLLAPSED_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // 保存されているのはcollapsedなので、expandedはその逆
          const allMenuLabels = navItems
            .filter(item => item.children)
            .map(item => item.label);
          const collapsedSet = new Set(parsed as string[]);
          const expandedSet = new Set(
            allMenuLabels.filter(label => !collapsedSet.has(label))
          );
          setExpandedMenus(expandedSet);
        }
      } catch {
        // 読み込み失敗時はデフォルト
      }
    };
    
    if (typeof window !== "undefined") {
      const timer = setTimeout(loadMenuState, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // メニューの開閉状態をlocalStorageに保存
  const saveMenuState = (expandedSet: Set<string>) => {
    try {
      const allMenuLabels = navItems
        .filter(item => item.children)
        .map(item => item.label);
      const collapsedSet = allMenuLabels.filter(label => !expandedSet.has(label));
      localStorage.setItem(MENU_COLLAPSED_KEY, JSON.stringify(collapsedSet));
    } catch {
      // 保存失敗時は無視
    }
  };

  const toggleMenu = (label: string) => {
    const newSet = new Set(expandedMenus);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setExpandedMenus(newSet);
    saveMenuState(newSet);
  };

  // アクティブ状態の判定
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== "/" && pathname?.startsWith(href + "/")) return true;
    return false;
  };

  // 親メニューがアクティブかどうか
  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    if (item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return false;
  };

  // 縮小時のナビアイテム（ツールチップ付き）
  const CompactNavItem = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const isHovered = hoveredNavItem === item.href;

    return (
      <div className="relative">
        <Link
          href={item.href}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl mx-auto",
            "transition-all duration-200 ease-out",
            active
              ? "bg-white text-black shadow-sm border border-[#e5e5e5]"
              : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
          )}
          onMouseEnter={() => setHoveredNavItem(item.href)}
          onMouseLeave={() => setHoveredNavItem(null)}
        >
          {item.icon}
        </Link>
        
        {/* ツールチップ */}
        {isHovered && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-50">
            {item.label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-gray-900" />
          </div>
        )}
      </div>
    );
  };

  // 縮小時の親メニュー（子要素がある場合）
  const CompactParentNavItem = ({ item }: { item: NavItem }) => {
    const active = isParentActive(item);
    const isHovered = hoveredNavItem === item.href;
    const isExpanded = expandedMenus.has(item.label);

    return (
      <div className="relative">
        <button
          onClick={() => toggleMenu(item.label)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl mx-auto",
            "transition-all duration-200 ease-out",
            active
              ? "bg-white text-black shadow-sm border border-[#e5e5e5]"
              : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
          )}
          onMouseEnter={() => setHoveredNavItem(item.href)}
          onMouseLeave={() => setHoveredNavItem(null)}
        >
          {item.icon}
        </button>
        
        {/* ツールチップ */}
        {isHovered && !isExpanded && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-50">
            {item.label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-gray-900" />
          </div>
        )}

        {/* 展開時の子メニュー（ポップアップ風） */}
        {isExpanded && item.children && (
          <div className="absolute left-full top-0 ml-2 py-2 bg-white rounded-xl shadow-lg border border-[#e5e5e5] min-w-[160px] z-40">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">
              {item.label}
            </div>
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 mx-1 rounded-lg",
                  "transition-all duration-150",
                  isActive(child.href)
                    ? "bg-gray-100 text-black font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className="flex-shrink-0">{child.icon}</span>
                <span className="text-sm">{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============ 縮小表示 ============
  if (isCollapsed) {
    return (
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[72px]",
          "flex flex-col",
          "bg-[#f9f9f9] border-r border-[#e5e5e5]",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-center h-14 border-b border-[#e5e5e5] bg-white">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">UP</span>
          </div>
        </div>

        {/* Toggle Button */}
        <div className="flex justify-center py-2">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-white text-gray-500 hover:text-gray-900 transition-colors"
            title="サイドバーを展開"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-1">
          {navItems.map((item) => (
            <div key={item.href} className="py-1">
              {item.children ? (
                <CompactParentNavItem item={item} />
              ) : (
                <CompactNavItem item={item} />
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Items */}
        <div className="py-2 space-y-1 border-t border-[#e5e5e5] bg-[#f9f9f9]">
          {bottomItems.map((item) => (
            <CompactNavItem key={item.href} item={item} />
          ))}
        </div>
      </aside>
    );
  }

  // ============ 展開表示 ============
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
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">UP</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[#1a1a1a] font-semibold text-sm tracking-tight">ADコパイロット</span>
            <span className="text-[#6b7280] text-[10px] truncate">AD Production</span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="サイドバーを縮小"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>
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
            const isExpanded = expandedMenus.has(item.label);

            return (
              <div key={item.href}>
                {/* Parent Item */}
                {hasChildren ? (
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl",
                      "transition-all duration-200 ease-out",
                      "group relative overflow-hidden",
                      isItemActive
                        ? "bg-white text-black border border-[#e5e5e5]"
                        : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                    )}
                  >
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
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
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
                {hasChildren && isExpanded && (
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
            <div className="flex items-center justify-between px-3 mb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#6b7280]" />
                <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">
                  履歴
                </span>
              </div>
            </div>

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
