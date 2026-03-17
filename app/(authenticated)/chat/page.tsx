"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { ChatPage } from "@/components/chat/ChatPage";
import { isValidFeatureId } from "@/lib/chat/chat-config";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebarOverlay } from "@/components/layout/MobileSidebarOverlay";
import { MobileChatHeader } from "@/components/chat/MobileChatHeader";

/**
 * 統合チャットページ
 *
 * クエリパラメータ:
 * - ?agent=xxx : 機能を指定（指定なしは一般チャット）
 * - ?chatId=xxx : 既存チャットを開く
 * - ?program=xxx : 指定番組で新規チャット（番組選択スキップ）
 * - ?message=xxx : 初期メッセージを送信して開始（URLエンコード推奨）
 */
function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);

  // agent指定があればそれを使用、なければ general
  const agentId = searchParams.get("agent") || "general";
  const featureId = isValidFeatureId(agentId) ? agentId : "general-chat";

  // chatId指定なし = 新規チャット、指定あり = 既存チャットの続き
  const chatId = searchParams.get("chatId") ?? undefined;

  // program指定あり = その番組で新規チャット開始（番組選択スキップ）
  const initialProgramId = searchParams.get("program") ?? undefined;

  // 初期メッセージ（トップページからの入力など）
  const initialMessage = searchParams.get("message") ?? undefined;

  // 新規チャット作成時にURLを更新（ブラウザ履歴を汚さないようreplaceState）
  const handleChatCreated = useCallback(
    (newChatId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("chatId", newChatId);
      router.replace(`/chat?${params.toString()}`);
    },
    [searchParams, router],
  );

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

    // 画面左端からの右スワイプで開く
    if (!isMobileSidebarOpen && startX <= edgeThreshold && deltaX > threshold) {
      setIsMobileSidebarOpen(true);
      return;
    }

    // オーバーレイ表示中の左スワイプで閉じる
    if (isMobileSidebarOpen && deltaX < -threshold) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* デスクトップ用サイドバー（固定） */}
      <aside className="hidden md:block fixed top-0 left-0 z-40 h-screen">
        <Sidebar />
      </aside>

      {/* メインエリア */}
      <div
        className="flex-1 md:ml-[240px] h-full flex flex-col overflow-hidden"
        // モバイルのみスワイプ検知
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* モバイル用ヘッダー */}
        <MobileChatHeader onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

        {/* チャット本体 */}
        <div className="flex-1 overflow-hidden">
          <ChatPage
            featureId={featureId}
            chatId={chatId}
            initialProgramId={initialProgramId}
            initialMessage={initialMessage}
            onChatCreated={handleChatCreated}
          />
        </div>
      </div>

      {/* モバイル用オーバーレイサイドバー */}
      <MobileSidebarOverlay open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <Sidebar />
      </MobileSidebarOverlay>
    </div>
  );
}

export default function ChatPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
