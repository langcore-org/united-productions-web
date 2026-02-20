"use client";

import { useEffect, useState } from "react";
import { FeatureChat } from "@/components/ui/FeatureChat";
import { getChatConfig, ChatFeatureId, updateChatConfigSystemPrompt, ToolOptions } from "@/lib/chat/chat-config";
import { featureIdToToolKey } from "@/lib/settings/db";

interface ChatPageProps {
  featureId: ChatFeatureId;
}

/**
 * Grokツール設定の型
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
  [key: string]: boolean | undefined;
}

export function ChatPage({ featureId }: ChatPageProps) {
  const [config, setConfig] = useState(getChatConfig(featureId));
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [grokToolSettings, setGrokToolSettings] = useState<GrokToolSettings | null>(null);

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      
      try {
        const baseConfig = getChatConfig(featureId);

        // プロポーザルの場合は動的プロンプトを取得
        if (featureId === "proposal") {
          const response = await fetch("/api/settings/program");
          if (response.ok) {
            const data = await response.json();
            const updatedConfig = updateChatConfigSystemPrompt(
              baseConfig,
              data.programInfo || "",
              data.pastProposals || ""
            );
            setConfig(updatedConfig);
            setSystemPrompt(updatedConfig.systemPrompt);
          } else {
            setConfig(baseConfig);
            setSystemPrompt(baseConfig.systemPrompt);
          }
        } else {
          setConfig(baseConfig);
          setSystemPrompt(baseConfig.systemPrompt);
        }

        // Grokツール設定を取得
        const toolResponse = await fetch("/api/settings/grok-tools");
        if (toolResponse.ok) {
          const toolData = await toolResponse.json();
          setGrokToolSettings(toolData);
        }
      } catch (error) {
        console.error("Failed to load config:", error);
        const fallbackConfig = getChatConfig(featureId);
        setConfig(fallbackConfig);
        setSystemPrompt(fallbackConfig.systemPrompt);
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, [featureId]);

  // 機能別ツール設定を計算
  const getToolOptions = (): ToolOptions => {
    // デフォルトのツール設定
    const defaultOptions = config.toolOptions;
    
    // 管理画面での設定があればマージ
    if (!grokToolSettings) return defaultOptions;
    
    const toolKey = featureIdToToolKey(featureId);
    const isEnabled = toolKey ? (grokToolSettings[toolKey] ?? false) : false;
    
    // 管理画面で無効化されている場合は全ツール無効
    if (!isEnabled) {
      return { enableWebSearch: false, enableXSearch: false, enableCodeExecution: false };
    }
    
    return defaultOptions;
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
      featureId={config.featureId}
      title={config.title}
      systemPrompt={systemPrompt}
      placeholder={config.placeholder}
      inputLabel={config.inputLabel}
      outputFormat={config.outputFormat}
      toolOptions={getToolOptions()}
      promptSuggestions={config.promptSuggestions}
    />
  );
}
