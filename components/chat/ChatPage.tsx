"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { type ChatFeatureId, getChatConfig } from "@/lib/chat/chat-config";

// FeatureChatを動的インポート
const FeatureChat = dynamic(
  () => import("@/components/ui/FeatureChat").then((mod) => mod.FeatureChat),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    ),
  },
);

interface ChatPageProps {
  featureId: ChatFeatureId;
}

export function ChatPage({ featureId }: ChatPageProps) {
  const [config, setConfig] = useState(getChatConfig(featureId));
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);

      try {
        const baseConfig = getChatConfig(featureId);
        setConfig(baseConfig);
        setSystemPrompt(baseConfig.systemPrompt);
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
      promptSuggestions={config.promptSuggestions}
      enableProgramSelector={true}
    />
  );
}
