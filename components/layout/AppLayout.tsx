"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  showThemeToggle?: boolean;
}

/**
 * アプリケーション共通レイアウト
 * - Sidebar（オーバーレイ表示）
 * - テーマ切り替えボタン
 * - 背景色管理（light/dark）
 */
export function AppLayout({ 
  children, 
  className,
  showThemeToggle = true 
}: AppLayoutProps) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isDarkMode 
        ? "bg-[#0d0d12] text-gray-100" 
        : "bg-white text-gray-900",
      className
    )}>
      {/* Sidebar - オーバーレイ表示 */}
      <Sidebar />

      {/* Theme Toggle - Top Right */}
      {showThemeToggle && (
        <button
          onClick={toggleTheme}
          className={cn(
            "fixed top-4 right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium",
            "transition-all duration-300",
            isDarkMode 
              ? "bg-[#1a1a24] text-gray-300 hover:bg-[#252532] border border-[#2a2a35]" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
          )}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">ライト</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span className="hidden sm:inline">ダーク</span>
            </>
          )}
        </button>
      )}

      {/* Main Content */}
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
