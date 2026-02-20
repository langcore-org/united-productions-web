"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FeatureChat } from "@/components/ui/FeatureChat";
import { getGemById, GEMS, isProposalGem } from "@/lib/chat/gems";
import { updateProposalSystemPrompt } from "@/lib/chat/gems";
import { featureIdToToolKey } from "@/lib/settings/db";
import type { ChatFeatureId } from "@/lib/chat/chat-config";

/**
 * Grokツール設定の型（Web検索のみ）
 * システム設定から取得した値を使用
 */
interface GrokToolSettings {
  generalChat: boolean;
  researchCast: boolean;
  researchLocation: boolean;
  researchInfo: boolean;
  researchEvidence: boolean;
  minutes: boolean;
  proposal: boolean;
  naScript: boolean;
  
  // 他のツール設定（型互換性のため）
  [key: string]: boolean | undefined;
}

/**
 * 統合チャットページ
 * 
 * クエリパラメータ ?gem=xxx で機能を指定
 * 指定がない場合は一般チャット
 */
function ChatPageContent() {
  const searchParams = useSearchParams();
  const gemId = searchParams.get("gem") || "general";
  const isNewChat = searchParams.get("new") === "1";
  
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

  // 現在の機能でGrokツールが有効かどうか
  const isGrokToolEnabled = (): boolean => {
    if (!grokToolSettings) return false;
    
    const toolKey = featureIdToToolKey(gem.id as ChatFeatureId);
    if (!toolKey) return false;
    
    return grokToolSettings[toolKey] ?? false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <FeatureChat
      key={`${gem.id}-${isNewChat ? Date.now() : "default"}`}
      featureId={gem.id}
      title={gem.name}
      systemPrompt={systemPrompt}
      placeholder={gem.placeholder}
      inputLabel={gem.inputLabel}
      outputFormat={gem.outputFormat}
      enableGrokTools={isGrokToolEnabled()}
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
