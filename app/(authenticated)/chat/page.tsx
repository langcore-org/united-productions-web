"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FeatureChat } from "@/components/ui/FeatureChat";
import { getGemById, GEMS, isProposalGem } from "@/lib/chat/gems";
import { updateProposalSystemPrompt } from "@/lib/chat/gems";
import { featureIdToToolKey, GrokToolSettings } from "@/lib/settings/db";
import type { ChatFeatureId, ToolOptions } from "@/lib/chat/chat-config";

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
  const [grokToolSettings, setGrokToolSettings] = useState<GrokToolSettings | null>(null);

  useEffect(() => {
    async function loadGem() {
      setIsLoading(true);
      
      try {
        const selectedGem = getGemById(gemId as any);
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

        // Grokツール設定を取得
        const toolResponse = await fetch("/api/settings/grok-tools");
        if (toolResponse.ok) {
          const toolData = await toolResponse.json();
          setGrokToolSettings(toolData);
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

  // 機能別ツール設定を計算
  const getToolOptions = (): ToolOptions => {
    // デフォルトのツール設定
    const defaultOptions: ToolOptions = gem.toolOptions || { enableWebSearch: false };
    
    // 管理画面での設定があればマージ
    if (!grokToolSettings) return defaultOptions;
    
    const toolKey = featureIdToToolKey(gem.id as ChatFeatureId);
    const isEnabled = toolKey ? (grokToolSettings[toolKey] ?? false) : false;
    
    // 管理画面で無効化されている場合は全ツール無効
    if (!isEnabled) {
      return { enableWebSearch: false, enableXSearch: false, enableCodeExecution: false };
    }
    
    return defaultOptions;
  };

  // 新規チャット作成時にURLを更新（ブラウザ履歴を汚さないようreplaceState）
  const handleChatCreated = useCallback((newChatId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("chatId", newChatId);
    router.replace(`/chat?${params.toString()}`);
  }, [searchParams, router]);

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
      toolOptions={getToolOptions()}
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
