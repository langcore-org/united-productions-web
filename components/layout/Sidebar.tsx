"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
  Mic,
  Search,
  Calendar,
  Settings,
  LogOut,
  History,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
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
  const [hoveredHistoryId, setHoveredHistoryId] = useState<string | null>(null);

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
            <span className="text-[#1a1a1a] font-semibold text-sm tracking-tight">AI Hub</span>
            <span className="text-[#6b7280] text-[10px] truncate">United Productions</span>
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
                    ? "bg-white text-black border border-[#e5e5e5]"
                    : "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                )}
                <span className={cn(
                  "flex-shrink-0 transition-transform duration-200",
                  isActive ? "text-black" : "group-hover:scale-110"
                )}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 text-black font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
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
                          <MessageSquare className={cn(
                            "w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150",
                            hoveredHistoryId === item.id ? "text-black" : "text-[#9ca3af]"
                          )} />
                          <span className="truncate flex-1">{item.title}</span>
                        </button>
                        
                        {/* Hover Actions */}
                        <div className={cn(
                          "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
                          "bg-white rounded-md px-1 shadow-sm border border-[#e5e5e5]",
                          "transition-all duration-150",
                          hoveredHistoryId === item.id ? "opacity-100 visible" : "opacity-0 invisible"
                        )}>
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
              "text-[#6b7280] hover:bg-white hover:text-[#1a1a1a]",
              "transition-all duration-200 ease-out group"
            )}
          >
            <span className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
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
