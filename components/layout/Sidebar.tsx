"use client";

import { cn } from "@/lib/utils";
import {
  Plus,
  MessageSquare,
  Search,
  FileText,
  Lightbulb,
  Mic,
  Settings,
  LogOut,
  History,
  Users,
  MapPin,
  Info,
  Shield,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarProps {
  className?: string;
}

interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
}

// モック履歴データ
const mockHistory: ChatHistory[] = [
  { id: "1", title: "制作会議の議事録作成", timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { id: "2", title: "ロケ地候補のリサーチ", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: "3", title: "新企画のアイデア出し", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { id: "4", title: "出演者リサーチ", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
];

// 相対時間を計算
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "今";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
  return `${Math.floor(diffInSeconds / 86400)}日前`;
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

const bottomItems = [
  {
    icon: <Tv className="w-[18px] h-[18px]" />,
    label: "番組設定",
    href: "/settings/program",
  },
  {
    icon: <Settings className="w-[18px] h-[18px]" />,
    label: "管理画面",
    href: "/admin/settings",
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // localStorageからメニューの開閉状態を読み込む
  useEffect(() => {
    const loadMenuState = () => {
      try {
        const saved = localStorage.getItem("sidebar-expanded-menus");
        if (saved) {
          setExpandedMenus(new Set(JSON.parse(saved)));
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

  // メニューの開閉状態を保存
  const saveMenuState = (expandedSet: Set<string>) => {
    try {
      localStorage.setItem("sidebar-expanded-menus", JSON.stringify([...expandedSet]));
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
    // クエリパラメータを無視してパスだけ比較
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

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 h-screen w-[280px]",
        "flex flex-col",
        "bg-[#f9f9f9] border-r border-[#e5e5e5]",
        className
      )}
    >
      {/* Header - アイコンのみ */}
      <div className="flex items-center justify-center h-14 px-4 bg-white">
        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">UP</span>
        </div>
      </div>

      {/* New Chat Button -->
      <div className="px-3 pt-3 pb-2 bg-[#f9f9f9]">
        <button
          onClick={() => router.push("/chat")}
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
          <span className="text-sm font-medium text-[#1a1a1a]">新しいチャット</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#f9f9f9]">
        {/* Main Nav Items */}
        <div className="px-2 py-2 space-y-0.5 flex-shrink-0">
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
                      <span className={cn(
                        "flex-shrink-0 transition-transform duration-200",
                        isItemActive ? "text-black" : "group-hover:scale-110"
                      )}>
                        {item.icon}
                      </span>
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
                    </button>

                    {/* Submenu */}
                    {isExpanded && item.submenuItems && (
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
                    <span className={cn(
                      "flex-shrink-0 transition-transform duration-200",
                      isActive(item.href) ? "text-black" : "group-hover:scale-110"
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate">
                      {item.label}
                    </span>
                  </Link>
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
              <div className="space-y-0.5">
                {mockHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group relative"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      href={`/chat/${item.id}`}
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
                        <span className="text-[10px] text-gray-400">{getRelativeTime(item.timestamp)}</span>
                      </div>
                    </Link>

                    {hoveredItem === item.id && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white rounded-md px-1 shadow-sm border border-[#e5e5e5]">
                        <button className="p-1 rounded hover:bg-[#f0f0f0] text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button className="p-1 rounded hover:bg-[#f0f0f0] text-[#6b7280] hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
            <span className={cn(
              "flex-shrink-0 transition-transform duration-200",
              isActive(item.href) ? "text-black" : "group-hover:scale-110"
            )}>
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
        
        <Link
          href="/logout"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl",
            "transition-all duration-200 ease-out group",
            "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
          )}
        >
          <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            <LogOut className="w-[18px] h-[18px]" />
          </span>
          <span className="text-sm font-medium">ログアウト</span>
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
