"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { FileText, Mic, Search, Calendar, AtSign, Send } from "lucide-react";
import Link from "next/link";

interface ModeButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const modeButtons: ModeButton[] = [
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
    id: "research",
    label: "リサーチ",
    icon: <Search className="w-4 h-4" />,
    href: "/research",
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

  return (
    <div className="flex min-h-screen bg-[#0d0d12]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content - Centered */}
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b00] to-[#ff8533] flex items-center justify-center shadow-lg shadow-[#ff6b00]/20">
                <span className="text-3xl font-bold text-white">AI</span>
              </div>
              <h1 className="text-5xl font-bold text-white tracking-tight">
                Hub
              </h1>
            </div>
            <p className="text-gray-400 text-lg">
              United Productions の制作支援AIプラットフォーム
            </p>
          </div>

          {/* Mode Selection Buttons */}
          <div className="flex items-center gap-3 mb-6">
            {modeButtons.map((mode) => (
              <Link
                key={mode.id}
                href={mode.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full",
                  "bg-[#1a1a24] border border-[#2a2a35]",
                  "text-gray-300 text-sm font-medium",
                  "hover:border-[#ff6b00]/50 hover:text-white hover:bg-[#1f1f2a]",
                  "transition-all duration-200"
                )}
              >
                <span className="text-[#ff6b00]">{mode.icon}</span>
                <span>{mode.label}</span>
              </Link>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="w-full max-w-3xl">
            <div
              className={cn(
                "relative flex items-center",
                "bg-[#1a1a24] border border-[#2a2a35] rounded-3xl",
                "px-4 py-3",
                "focus-within:border-[#ff6b00]/50 focus-within:ring-1 focus-within:ring-[#ff6b00]/20",
                "transition-all duration-200"
              )}
            >
              {/* Attachment Button */}
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full mr-3",
                  "text-gray-400 hover:text-white hover:bg-[#2a2a35]",
                  "transition-colors duration-200"
                )}
              >
                <AtSign className="w-5 h-5" />
              </button>

              {/* Input Field */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="何でも聞いてください"
                className={cn(
                  "flex-1 bg-transparent text-white text-base",
                  "placeholder:text-gray-500",
                  "focus:outline-none"
                )}
              />

              {/* Send Button */}
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full ml-3",
                  "bg-[#ff6b00] text-white",
                  "hover:bg-[#ff8533]",
                  "transition-colors duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                disabled={!inputValue.trim()}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subtle Footer Text */}
          <p className="mt-8 text-sm text-gray-500">
            AI Hubは制作業務を効率化するためのAI支援ツールです
          </p>
        </main>
      </div>
    </div>
  );
}
