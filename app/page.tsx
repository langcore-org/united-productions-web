"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { FileText, Mic, Search, Calendar, AtSign, Send, Sparkles, Newspaper, Image, Zap } from "lucide-react";
import Link from "next/link";

interface ModeButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: string;
}

const modeButtons: ModeButton[] = [
  {
    id: "deepsearch",
    label: "DeepSearch",
    icon: <Search className="w-4 h-4" />,
    href: "/research",
    shortcut: "⌘K",
  },
  {
    id: "imagine",
    label: "Imagine",
    icon: <Image className="w-4 h-4" />,
    href: "#",
    shortcut: "⌘I",
  },
  {
    id: "news",
    label: "最新ニュース",
    icon: <Newspaper className="w-4 h-4" />,
    href: "#",
    shortcut: "⌘N",
  },
  {
    id: "meeting-notes",
    label: "議事録",
    icon: <FileText className="w-4 h-4" />,
    href: "/meeting-notes",
  },
  {
    id: "transcripts",
    label: "起こし・NA",
    icon: <Mic className="w-4 h-4" />,
    href: "/transcripts",
  },
  {
    id: "schedules",
    label: "ロケスケ",
    icon: <Calendar className="w-4 h-4" />,
    href: "/schedules",
  },
];

export default function DashboardPage() {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("main-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content - Centered */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
          {/* Logo Section - Large Centered */}
          <div className="flex flex-col items-center mb-16">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#ff6b00] via-[#ff8533] to-[#ffa366] flex items-center justify-center shadow-2xl shadow-[#ff6b00]/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-6xl font-bold text-white tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text">
                AI Hub
              </h1>
            </div>
            <p className="text-gray-500 text-lg font-light">
              United Productions の制作支援AIプラットフォーム
            </p>
          </div>

          {/* Large Search/Input Bar */}
          <div className="w-full max-w-4xl mb-10">
            <div
              className={cn(
                "relative flex items-center",
                "bg-[#141419] border border-[#2a2a35] rounded-[2rem]",
                "px-6 py-5",
                "shadow-2xl shadow-black/50",
                isFocused && "border-[#ff6b00]/50 ring-2 ring-[#ff6b00]/10",
                "transition-all duration-300 ease-out"
              )}
            >
              {/* Attachment Button */}
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full mr-4 shrink-0",
                  "bg-[#1f1f28] text-gray-400",
                  "hover:text-white hover:bg-[#2a2a35] hover:scale-105",
                  "transition-all duration-200"
                )}
              >
                <AtSign className="w-5 h-5" />
              </button>

              {/* Input Field */}
              <input
                id="main-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="何でも聞いてください..."
                className={cn(
                  "flex-1 bg-transparent text-white text-lg",
                  "placeholder:text-gray-600",
                  "focus:outline-none"
                )}
              />

              {/* Shortcut Hint */}
              {!inputValue && (
                <div className="hidden sm:flex items-center gap-1 mr-4 text-gray-600 text-sm">
                  <kbd className="px-2 py-1 rounded-md bg-[#1f1f28] border border-[#2a2a35] text-xs">
                    ⌘
                  </kbd>
                  <kbd className="px-2 py-1 rounded-md bg-[#1f1f28] border border-[#2a2a35] text-xs">
                    K
                  </kbd>
                </div>
              )}

              {/* Send Button */}
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full shrink-0",
                  "bg-[#ff6b00] text-white",
                  "hover:bg-[#ff8533] hover:scale-105 hover:shadow-lg hover:shadow-[#ff6b00]/30",
                  "active:scale-95",
                  "transition-all duration-200",
                  !inputValue.trim() && "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none"
                )}
                disabled={!inputValue.trim()}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Selection Buttons - Pill Style */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8 max-w-4xl">
            {modeButtons.map((mode) => (
              <Link
                key={mode.id}
                href={mode.href}
                className={cn(
                  "group flex items-center gap-2.5 px-5 py-2.5 rounded-full",
                  "bg-[#141419] border border-[#2a2a35]",
                  "text-gray-400 text-sm font-medium",
                  "hover:border-[#ff6b00]/50 hover:text-white hover:bg-[#1a1a22]",
                  "hover:shadow-lg hover:shadow-[#ff6b00]/10",
                  "active:scale-95",
                  "transition-all duration-200"
                )}
              >
                <span className="text-[#ff6b00] group-hover:scale-110 transition-transform duration-200">
                  {mode.icon}
                </span>
                <span>{mode.label}</span>
                {mode.shortcut && (
                  <span className="ml-1 text-xs text-gray-600 group-hover:text-gray-500">
                    {mode.shortcut}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-4 mb-12">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 text-sm hover:text-gray-300 hover:bg-[#141419] transition-all duration-200">
              <Zap className="w-4 h-4" />
              <span>クイックスタート</span>
            </button>
            <span className="text-gray-700">|</span>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 text-sm hover:text-gray-300 hover:bg-[#141419] transition-all duration-200">
              <Search className="w-4 h-4" />
              <span>ドキュメント検索</span>
            </button>
          </div>

          {/* Subtle Footer Text */}
          <p className="text-sm text-gray-600">
            AI Hubは制作業務を効率化するためのAI支援ツールです
          </p>
        </main>
      </div>
    </div>
  );
}
