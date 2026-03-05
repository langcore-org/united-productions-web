"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { ChatPage } from "@/components/chat/ChatPage";
import { isValidFeatureId } from "@/lib/chat/chat-config";

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

  return (
    <ChatPage
      featureId={featureId}
      chatId={chatId}
      initialProgramId={initialProgramId}
      initialMessage={initialMessage}
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
