"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { ChatPage } from "@/components/chat/ChatPage";
import { isValidFeatureId } from "@/lib/chat/chat-config";

/**
 * 統合チャットページ
 *
 * クエリパラメータ ?agent=xxx で機能を指定
 * 指定がない場合は一般チャット
 */
function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // agent指定があればそれを使用、なければ general
  const agentId = searchParams.get("agent") || "general";
  const featureId = isValidFeatureId(agentId) ? agentId : "general-chat";

  // chatId指定なし = 新規チャット、指定あり = 既存チャットの続き
  const chatId = searchParams.get("chatId") ?? undefined;

  // 新規チャット作成時にURLを更新（ブラウザ履歴を汚さないようreplaceState）
  const handleChatCreated = useCallback(
    (newChatId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("chatId", newChatId);
      router.replace(`/chat?${params.toString()}`);
    },
    [searchParams, router],
  );

  return (
    <ChatPage
      featureId={featureId}
      chatId={chatId}
      onChatCreated={handleChatCreated}
    />
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
