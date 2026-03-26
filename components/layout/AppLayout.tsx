"use client";

import { useRef, useState } from "react";
import { MobileChatHeader } from "@/components/chat/MobileChatHeader";
import { cn } from "@/lib/utils";
import { MobileSidebarOverlay } from "./MobileSidebarOverlay";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * アプリケーション共通レイアウト
 * - Sidebar（デスクトップ: 常時表示、モバイル: スワイプ/ハンバーガーで表示）
 * - ライトモード固定
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchCurrentXRef.current = touch.clientX;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    const touch = event.touches[0];
    touchCurrentXRef.current = touch.clientX;
  };

  const handleTouchEnd = () => {
    const startX = touchStartXRef.current;
    const endX = touchCurrentXRef.current;
    touchStartXRef.current = null;
    touchCurrentXRef.current = null;

    if (startX === null || endX === null) return;

    const deltaX = endX - startX;
    const threshold = 40;
    const edgeThreshold = 24;

    if (!isMobileSidebarOpen && startX <= edgeThreshold && deltaX > threshold) {
      setIsMobileSidebarOpen(true);
      return;
    }

    if (isMobileSidebarOpen && deltaX < -threshold) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <div
      className={cn("h-screen overflow-hidden bg-white text-gray-900 flex", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar - デスクトップのみ表示 */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="h-screen overflow-hidden flex-1 min-w-0 flex flex-col">
        {/* モバイル用ヘッダー */}
        <MobileChatHeader onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>

      {/* モバイル用オーバーレイサイドバー */}
      <MobileSidebarOverlay open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <Sidebar />
      </MobileSidebarOverlay>
    </div>
  );
}

export default AppLayout;
