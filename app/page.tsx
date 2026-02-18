"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  FileText, 
  Mic, 
  Search, 
  Calendar, 
  AtSign, 
  Send, 
  Sparkles, 
  Newspaper, 
  Image, 
  Moon,
  Sun,
  AudioLines,
  ArrowUp,
  Globe
} from "lucide-react";
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
  },
  {
    id: "imagine",
    label: "Imagine",
    icon: <Image className="w-4 h-4" />,
    href: "#",
  },
  {
    id: "news",
    label: "最新ニュース",
    icon: <Newspaper className="w-4 h-4" />,
    href: "#",
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
  // Theme is managed by ThemeProvider
  const [isVoiceMode, setIsVoiceMode] = useState(false);

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

  // Theme toggle handler - sync with sidebar
  useEffect(() => {
    // Apply theme to document for global consistency
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSend = () => {
    if (inputValue.trim()) {
      // Handle send action
      console.log("Sending:", inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppLayout>
      <div className={cn(
      "flex min-h-screen transition-colors duration-500",
      isDarkMode ? "bg-[#0a0a0f]" : "bg-white"
    )}>
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 right-6 z-10">
          <button
            onClick={() => /* toggle theme via ThemeProvider */}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium",
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
        </div>

        {/* Main Content - Centered */}
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Logo Section - Minimal Centered (Grok Style) */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                isDarkMode 
                  ? "bg-gradient-to-br from-[#ff6b00] via-[#ff8533] to-[#ffa366] shadow-xl shadow-[#ff6b00]/20" 
                  : "bg-gradient-to-br from-[#ff6b00] via-[#ff8533] to-[#ffa366] shadow-lg shadow-[#ff6b00]/15"
              )}>
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className={cn(
                "text-4xl font-semibold tracking-tight transition-colors duration-300",
                isDarkMode 
                  ? "text-white" 
                  : "text-gray-900"
              )}>
                AI Hub
              </h1>
            </div>
            <p className={cn(
              "text-sm font-light transition-colors duration-300",
              isDarkMode ? "text-gray-500" : "text-gray-500"
            )}>
              United Productions の制作支援AIプラットフォーム
            </p>
          </div>

          {/* Large Search/Input Bar - Grok Style */}
          <div className="w-full max-w-3xl mb-8">
            <div
              className={cn(
                "relative flex flex-col",
                isDarkMode 
                  ? "bg-[#141419] border-[#2a2a35]" 
                  : "bg-white border-gray-200 shadow-lg shadow-gray-100",
                "border rounded-3xl",
                "transition-all duration-300 ease-out",
                isFocused && (isDarkMode 
                  ? "border-[#ff6b00]/50 shadow-2xl shadow-[#ff6b00]/10" 
                  : "border-[#ff6b00]/40 shadow-xl shadow-[#ff6b00]/10 ring-4 ring-[#ff6b00]/5")
              )}
            >
              {/* Input Row */}
              <div className="flex items-center px-5 py-4">
                {/* Globe Icon */}
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full mr-3 shrink-0",
                    "transition-all duration-200",
                    isDarkMode 
                      ? "text-gray-500 hover:text-gray-300 hover:bg-[#1f1f28]" 
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  )}
                  title="検索設定"
                >
                  <Globe className="w-5 h-5" />
                </button>

                {/* Input Field */}
                <input
                  id="main-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder={isVoiceMode ? "話しかけてください..." : "何でも聞いてください..."}
                  className={cn(
                    "flex-1 bg-transparent text-lg",
                    "focus:outline-none",
                    "transition-colors duration-300",
                    isDarkMode 
                      ? "text-white placeholder:text-gray-600" 
                      : "text-gray-900 placeholder:text-gray-400"
                  )}
                />

                {/* Voice Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setIsVoiceMode(!isVoiceMode)}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full mr-2 shrink-0",
                    "transition-all duration-200",
                    isVoiceMode 
                      ? (isDarkMode ? "bg-[#ff6b00]/20 text-[#ff6b00]" : "bg-[#ff6b00]/10 text-[#ff6b00]")
                      : (isDarkMode 
                          ? "text-gray-500 hover:text-gray-300 hover:bg-[#1f1f28]" 
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100")
                  )}
                  title={isVoiceMode ? "テキストモード" : "ボイスモード"}
                >
                  <AudioLines className="w-5 h-5" />
                </button>

                {/* Send Button - Grok Style (Circular with Arrow) */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                    "transition-all duration-200",
                    inputValue.trim()
                      ? (isDarkMode 
                          ? "bg-[#ff6b00] text-white hover:bg-[#ff8533] hover:shadow-lg hover:shadow-[#ff6b00]/30" 
                          : "bg-[#ff6b00] text-white hover:bg-[#ff8533] hover:shadow-lg hover:shadow-[#ff6b00]/30")
                      : (isDarkMode 
                          ? "bg-[#2a2a35] text-gray-600 cursor-not-allowed" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed")
                  )}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Action Row */}
              <div className={cn(
                "flex items-center justify-between px-4 py-3 border-t",
                isDarkMode 
                  ? "border-[#2a2a35]/60" 
                  : "border-gray-100"
              )}>
                <div className="flex items-center gap-2">
                  {/* Attachment Button */}
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                      "transition-all duration-200",
                      isDarkMode 
                        ? "bg-[#1f1f28] text-gray-400 hover:bg-[#2a2a35] hover:text-gray-300 border border-[#2a2a35]" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700 border border-gray-200"
                    )}
                  >
                    <AtSign className="w-4 h-4" />
                    <span className="hidden sm:inline">添付</span>
                  </button>

                  {/* Shortcut Hint - Desktop Only */}
                  <div className={cn(
                    "hidden md:flex items-center gap-1 text-xs",
                    isDarkMode ? "text-gray-600" : "text-gray-400"
                  )}>
                    <span>⌘K でフォーカス</span>
                  </div>
                </div>

                {/* Character Count */}
                {inputValue.length > 0 && (
                  <span className={cn(
                    "text-xs",
                    isDarkMode ? "text-gray-600" : "text-gray-400"
                  )}>
                    {inputValue.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mode Selection Buttons - Elegant Pill Style (Grok Inspired) */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-4xl">
            {modeButtons.map((mode) => (
              <Link
                key={mode.id}
                href={mode.href}
                className={cn(
                  "group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                  "transition-all duration-200",
                  isDarkMode 
                    ? "bg-[#141419] border border-[#2a2a35] text-gray-400 hover:border-[#ff6b00]/50 hover:text-white hover:bg-[#1a1a22]" 
                    : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#ff6b00]/40 hover:text-gray-900 hover:bg-white hover:shadow-md"
                )}
              >
                <span className={cn(
                  "transition-all duration-200",
                  isDarkMode ? "text-[#ff6b00] group-hover:scale-110" : "text-[#ff6b00] group-hover:scale-110"
                )}>
                  {mode.icon}
                </span>
                <span>{mode.label}</span>
              </Link>
            ))}
          </div>

          {/* Voice Chat Button - New Addition */}
          <button
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full mb-8",
              "transition-all duration-300",
              isDarkMode 
                ? "bg-gradient-to-r from-[#ff6b00]/10 to-[#ff8533]/10 border border-[#ff6b00]/30 text-[#ff8533] hover:from-[#ff6b00]/20 hover:to-[#ff8533]/20 hover:border-[#ff6b00]/50" 
                : "bg-gradient-to-r from-[#ff6b00]/10 to-[#ff8533]/10 border border-[#ff6b00]/20 text-[#ff6b00] hover:from-[#ff6b00]/15 hover:to-[#ff8533]/15 hover:border-[#ff6b00]/30"
            )}
          >
            <span className="relative flex h-2.5 w-2.5 mr-1">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isDarkMode ? "bg-[#ff6b00]" : "bg-[#ff6b00]"
              )}></span>
              <span className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5",
                isDarkMode ? "bg-[#ff8533]" : "bg-[#ff8533]"
              )}></span>
            </span>
            <AudioLines className="w-4 h-4" />
            <span className="font-medium">ボイスチャットを開始</span>
          </button>

          {/* Simple Footer Text - Grok Style */}
          <div className={cn(
            "text-center transition-colors duration-300",
            isDarkMode ? "text-gray-600" : "text-gray-400"
          )}>
            <p className="text-sm">
              AI Hubは制作業務を効率化するためのAI支援ツールです
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs">
              <Link href="#" className="hover:underline">プライバシー</Link>
              <span>•</span>
              <Link href="#" className="hover:underline">利用規約</Link>
              <span>•</span>
              <Link href="#" className="hover:underline">ヘルプ</Link>
            </div>
          </div>
        </main>
      </div>
          </div>
    </AppLayout>
  );
}