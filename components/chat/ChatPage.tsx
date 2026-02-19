"use client";

import { useEffect, useState } from "react";
import { FeatureChat } from "@/components/ui/FeatureChat";
import { ChatFeatureId, getChatConfig, requiresDynamicPrompt } from "@/lib/chat/chat-config";
import { getProposalSystemPrompt } from "@/lib/prompts/proposal";

interface ChatPageProps {
  featureId: ChatFeatureId;
}

/**
 * 共通チャットページコンポーネント
 * 
 * すべてのチャット機能はこのコンポーネントを使用してレンダリングされる。
 * featureIdに応じて設定を動的に切り替える。
 */
export function ChatPage({ featureId }: ChatPageProps) {
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const config = getChatConfig(featureId);

  useEffect(() => {
    async function loadSystemPrompt() {
      setIsLoading(true);
      
      try {
        // 動的プロンプトが必要な場合（proposal機能）
        if (requiresDynamicPrompt(featureId)) {
          const response = await fetch("/api/settings/program");
          if (response.ok) {
            const data = await response.json();
            const prompt = getProposalSystemPrompt(
              data.programInfo || "",
              data.pastProposals || ""
            );
            setSystemPrompt(prompt);
          } else {
            // エラー時はデフォルトプロンプトを使用
            setSystemPrompt(config.systemPrompt);
          }
        } else {
          // 静的プロンプトを使用
          setSystemPrompt(config.systemPrompt);
        }
      } catch (error) {
        console.error("Failed to load system prompt:", error);
        setSystemPrompt(config.systemPrompt);
      } finally {
        setIsLoading(false);
      }
    }

    loadSystemPrompt();
  }, [featureId, config.systemPrompt]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <FeatureChat
      featureId={config.featureId}
      title={config.title}
      systemPrompt={systemPrompt}
      placeholder={config.placeholder}
      inputLabel={config.inputLabel}
      outputFormat={config.outputFormat}
    />
  );
}

export default ChatPage;
