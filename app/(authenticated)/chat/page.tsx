"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FeatureChat } from "@/components/ui/FeatureChat";
import { getGemById, GEMS, isProposalGem, updateProposalSystemPrompt } from "@/lib/chat/gems";

/**
 * 統合チャットページ
 *
 * クエリパラメータ ?gem=xxx で機能を指定
 * 指定がない場合は一般チャット
 */
function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gemId = searchParams.get("gem") || "general";
  // chatId指定なし = 新規チャット、指定あり = 既存チャットの続き
  const chatId = searchParams.get("chatId") ?? undefined;

  const [gem, setGem] = useState(GEMS[0]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGem() {
      setIsLoading(true);

      try {
        const selectedGem = getGemById(gemId as Parameters<typeof getGemById>[0]);
        setGem(selectedGem);

        if (isProposalGem(selectedGem.id)) {
          const response = await fetch("/api/settings/program");
          if (response.ok) {
            const data = await response.json();
            const updatedGem = updateProposalSystemPrompt(
              selectedGem,
              data.programInfo || "",
              data.pastProposals || ""
            );
            setSystemPrompt(updatedGem.systemPrompt);
          } else {
            setSystemPrompt(selectedGem.systemPrompt);
          }
        } else {
          setSystemPrompt(selectedGem.systemPrompt);
        }
      } catch (error) {
        console.error("Failed to load gem:", error);
        setGem(GEMS[0]);
        setSystemPrompt(GEMS[0].systemPrompt);
      } finally {
        setIsLoading(false);
      }
    }

    loadGem();
  }, [gemId]);

  // 新規チャット作成時にURLを更新（ブラウザ履歴を汚さないようreplaceState）
  const handleChatCreated = useCallback(
    (newChatId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("chatId", newChatId);
      router.replace(`/chat?${params.toString()}`);
    },
    [searchParams, router]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <FeatureChat
      key={`${gem.id}-${chatId ?? "new"}`}
      featureId={gem.id}
      chatId={chatId}
      onChatCreated={handleChatCreated}
      title={gem.name}
      systemPrompt={systemPrompt}
      placeholder={gem.placeholder}
      inputLabel={gem.inputLabel}
      outputFormat={gem.outputFormat}
      toolOptions={gem.toolOptions || { enableWebSearch: false }}
    />
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
