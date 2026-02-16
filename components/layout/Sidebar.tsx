"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
  Mic,
  Search,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  History,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
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
    icon: <FileText className="w-[18px] h-[18px]" />,
    label: "議事録・文字起こし",
    href: "/meeting-notes",
  },
  {
    icon: <Mic className="w-[18px] h-[18px]" />,
    label: "起こし・NA原稿",
    href: "/transcripts",
  },
  {
    icon: <Search className="w-[18px] h-[18px]" />,
    label: "リサーチ・考査",
    href: "/research",
    badge: "PJ-C",
  },
  {
    icon: <Calendar className="w-[18px] h-[18px]" />,
    label: "ロケスケ管理",
    href: "/schedules",
  },
];

const bottomItems: NavItem[] = [
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

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredHistoryId, setHoveredHistoryId] = useState<string | null>(null);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#0d0d12] border-r border-[#2a2a35]/60",
        "transition-all duration-300 ease-out",
        isCollapsed ? "w-[68px]" : "w-[280px]",
        className
      )}
    >
      {/* Logo Area */}
      <div className="flex items-center h-14 px-3 border-b border-[#2a2a35]/60">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b00] to-[#ff8533] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#ff6b00]/20">
            <span className="text-white font-bold text-sm">UP</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-white font-semibold text-sm tracking-tight">AI Hub</span>
              <span className="text-gray-500 text-[10px] truncate">United Productions</span>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-2">
          <button
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
              "bg-[#1a1a24] hover:bg-[#252532] border border-[#2a2a35]/80",
              "transition-all duration-200 ease-out",
              "group"
            )}
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#ff6b00] to-[#ff8533] flex items-center justify-center flex-shrink-0">
              <Plus className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-200">新規チャット</span>
          </button>
        </div>
      )}

      {/* Collapsed New Chat Button */}
      {isCollapsed && (
        <div className="flex justify-center py-3">
          <button
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-[#ff6b00] to-[#ff8533]",
              "hover:shadow-lg hover:shadow-[#ff6b00]/25 hover:scale-105",
              "transition-all duration-200 ease-out"
            )}
            title="新規チャット"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Main Nav Items */}
        <div className="px-2 py-2 space-y-0.5 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl",
                  "transition-all duration-200 ease-out",
                  "group relative overflow-hidden",
                  isActive
                    ? "bg-[#ff6b00]/10 text-[#ff6b00]"
                    : "text-gray-400 hover:bg-[#1a1a24] hover:text-gray-200"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#ff6b00] rounded-r-full" />
                )}
                <span className={cn(
                  "flex-shrink-0 transition-transform duration-200",
                  isActive ? "text-[#ff6b00]" : "group-hover:scale-110"
                )}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#ff6b00]/15 text-[#ff6b00] font-medium">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#ff6b00]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* History Section */}
        <div className={cn("flex-1 min-h-0 overflow-hidden", isCollapsed ? "mt-2" : "mt-4")}>
          {!isCollapsed ? (
            <div className="h-full flex flex-col">
              {/* History Header */}
              <div className="flex items-center justify-between px-3 mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    履歴
                  </span>
                </div>
              </div>

              {/* History Groups - Scrollable */}
              <div className="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar">
                {mockHistory.map((section) => (
                  <div key={section.label}>
                    <div className="px-1.5 mb-1.5">
                      <span className="text-[10px] font-medium text-gray-600">{section.label}</span>
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
                              "text-left text-[13px] text-gray-400",
                              "hover:bg-[#1a1a24] hover:text-gray-200",
                              "transition-all duration-150 ease-out"
                            )}
                            title={item.title}
                          >
                            <MessageSquare className={cn(
                              "w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150",
                              hoveredHistoryId === item.id ? "text-[#ff6b00]" : "text-gray-600"
                            )} />
                            <span className="truncate flex-1">{item.title}</span>
                          </button>
                          
                          {/* Hover Actions */}
                          <div className={cn(
                            "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
                            "bg-[#1a1a24] rounded-md px-1",
                            "transition-all duration-150",
                            hoveredHistoryId === item.id ? "opacity-100 visible" : "opacity-0 invisible"
                          )}>
                            <button
                              className="p-1 rounded hover:bg-[#2a2a35] text-gray-500 hover:text-gray-300 transition-colors"
                              title="編集"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              className="p-1 rounded hover:bg-[#2a2a35] text-gray-500 hover:text-red-400 transition-colors"
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
          ) : (
            /* Collapsed History */
            <div className="flex flex-col items-center pt-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  "text-gray-500 hover:bg-[#1a1a24] hover:text-gray-300",
                  "transition-all duration-200 cursor-pointer"
                )}
                title="履歴"
              >
                <History className="w-[18px] h-[18px]" />
              </div>
              {/* History dots indicator */}
              <div className="flex flex-col items-center gap-1.5 mt-3">
                {mockHistory.slice(0, 2).flatMap(s => s.items).slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      "bg-gray-700 hover:bg-[#ff6b00]",
                      "transition-all duration-200 cursor-pointer hover:scale-125"
                    )}
                    title={item.title}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Items */}
      <div className="py-2 px-2 space-y-0.5 border-t border-[#2a2a35]/60 flex-shrink-0">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl",
              "text-gray-400 hover:bg-[#1a1a24] hover:text-gray-200",
              "transition-all duration-200 ease-out group"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
              {item.icon}
            </span>
            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex items-center justify-center h-11",
          "border-t border-[#2a2a35]/60",
          "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a24]",
          "transition-all duration-200 ease-out"
        )}
        title={isCollapsed ? "展開" : "折りたたみ"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <div className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-medium">折りたたみ</span>
          </div>
        )}
      </button>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2a2a35;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3a3a45;
        }
      `}</style>
    </aside>
  );
}
