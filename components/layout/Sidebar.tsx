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
    icon: <FileText className="w-5 h-5" />,
    label: "議事録・文字起こし",
    href: "/meeting-notes",
  },
  {
    icon: <Mic className="w-5 h-5" />,
    label: "起こし・NA原稿",
    href: "/transcripts",
  },
  {
    icon: <Search className="w-5 h-5" />,
    label: "リサーチ・考査",
    href: "/research",
    badge: "PJ-C",
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    label: "ロケスケ管理",
    href: "/schedules",
  },
];

const bottomItems: NavItem[] = [
  {
    icon: <Settings className="w-5 h-5" />,
    label: "設定",
    href: "/settings",
  },
  {
    icon: <LogOut className="w-5 h-5" />,
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

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#1a1a24] border-r border-[#2a2a35]",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo Area */}
      <div className="flex items-center h-16 px-4 border-b border-[#2a2a35]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff6b00] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">UP</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm">AI Hub</span>
              <span className="text-gray-500 text-xs">United Productions</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "transition-colors duration-200",
                "group relative",
                isActive
                  ? "bg-[#ff6b00]/10 text-[#ff6b00]"
                  : "text-gray-400 hover:bg-[#2a2a35] hover:text-gray-200"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={cn("flex-shrink-0", isActive && "text-[#ff6b00]")}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#ff6b00]/20 text-[#ff6b00]">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff6b00]" />
              )}
            </Link>
          );
        })}

        {/* History Section */}
        <div className={cn("mt-6", isCollapsed && "mt-4")}>
          {!isCollapsed ? (
            <>
              {/* History Header */}
              <div className="flex items-center gap-2 px-3 mb-3">
                <History className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  履歴
                </span>
              </div>

              {/* History Groups */}
              <div className="space-y-4">
                {mockHistory.map((section) => (
                  <div key={section.label}>
                    <div className="px-3 mb-1.5">
                      <span className="text-xs text-gray-600">{section.label}</span>
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg",
                            "text-left text-sm text-gray-400",
                            "hover:bg-[#2a2a35] hover:text-gray-200",
                            "transition-colors duration-200",
                            "group"
                          )}
                          title={item.title}
                        >
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-gray-600 group-hover:text-gray-500" />
                          <span className="truncate">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Collapsed History Icon */
            <div className="flex flex-col items-center gap-3 pt-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-[#2a2a35] hover:text-gray-300 transition-colors cursor-pointer"
                title="履歴"
              >
                <History className="w-4 h-4" />
              </div>
              {/* Show a few dots to indicate history items */}
              <div className="flex flex-col items-center gap-1.5">
                {mockHistory[0].items.slice(0, 3).map((item, idx) => (
                  <div
                    key={item.id}
                    className="w-2 h-2 rounded-full bg-gray-700 hover:bg-gray-500 transition-colors cursor-pointer"
                    title={item.title}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Items */}
      <div className="py-4 px-2 space-y-1 border-t border-[#2a2a35]">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg",
              "text-gray-400 hover:bg-[#2a2a35] hover:text-gray-200",
              "transition-colors duration-200"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex items-center justify-center h-10",
          "border-t border-[#2a2a35]",
          "text-gray-500 hover:text-gray-300 hover:bg-[#2a2a35]",
          "transition-colors duration-200"
        )}
        title={isCollapsed ? "展開" : "折りたたみ"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <div className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs">折りたたみ</span>
          </div>
        )}
      </button>
    </aside>
  );
}
