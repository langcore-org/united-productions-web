"use client";

import {
  ArrowUp,
  FileText,
  Globe,
  Lightbulb,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

interface ModeButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const modeButtons: ModeButton[] = [
  {
    id: "chat",
    label: "チャット",
    icon: <MessageSquare className="w-4 h-4" />,
    href: "/chat?new=1",
  },
  {
    id: "research-cast",
    label: "出演者リサーチ",
    icon: <Users className="w-4 h-4" />,
    href: "/chat?agent=research-cast&new=1",
  },
  {
    id: "research-evidence",
    label: "エビデンスリサーチ",
    icon: <Shield className="w-4 h-4" />,
    href: "/chat?agent=research-evidence&new=1",
  },
  {
    id: "minutes",
    label: "議事録作成",
    icon: <FileText className="w-4 h-4" />,
    href: "/chat?agent=minutes&new=1",
  },
  {
    id: "proposal",
    label: "新企画立案",
    icon: <Lightbulb className="w-4 h-4" />,
    href: "/chat?agent=proposal&new=1",
  },
];

export default function DashboardPage() {
  const router = useRouter();
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

  const handleSend = () => {
    if (inputValue.trim()) {
      // 一般チャットとしてメッセージを送信
      const encodedMessage = encodeURIComponent(inputValue.trim());
      router.push(`/chat?new=1&message=${encodedMessage}`);
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
      <div className="flex min-h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Main Content - Centered */}
          <main className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Teddy</h1>
              </div>
              {/* ロゴ下のサブタイトル削除 */}
            </div>

            {/* Search/Input Bar */}
            <div className="w-full max-w-3xl mb-8">
              <div
                className={cn(
                  "relative flex flex-col bg-white border border-gray-200 rounded-3xl shadow-lg",
                  "transition-all duration-300",
                  isFocused && "border-black shadow-xl ring-4 ring-black/5",
                )}
              >
                {/* Input Row */}
                <div className="flex items-center px-5 py-4">
                  <button
                    type="button"
                    className="flex items-center justify-center w-10 h-10 rounded-full mr-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    title="検索設定"
                  >
                    <Globe className="w-5 h-5" />
                  </button>

                  <input
                    id="main-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力..."
                    className="flex-1 bg-transparent text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full",
                      inputValue.trim()
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed",
                    )}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>

                {/* Bottom Action Row */}
                <div className="flex items-center justify-end px-4 py-3 border-t border-gray-100">
                  {inputValue.length > 0 && (
                    <span className="text-xs text-gray-400">{inputValue.length}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Mode Selection Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl">
              {modeButtons.map((mode) => (
                <Link
                  key={mode.id}
                  href={mode.href}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:border-black hover:text-black hover:bg-white hover:shadow-md transition-all duration-200"
                >
                  <span className="text-black group-hover:scale-110 transition-transform">
                    {mode.icon}
                  </span>
                  <span>{mode.label}</span>
                </Link>
              ))}
            </div>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
