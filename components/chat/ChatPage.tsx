"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { type ChatFeatureId, getChatConfig } from "@/lib/chat/chat-config";
import { needsProgramSelection } from "@/lib/chat/welcome-messages";
import { ProgramSelectionView } from "./ProgramSelectionView";

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
  chatId?: string;
  /** 初期番組ID（指定時は番組選択をスキップ） */
  initialProgramId?: string;
  onChatCreated?: (chatId: string) => void;
}

export function ChatPage({ featureId, chatId, initialProgramId, onChatCreated }: ChatPageProps) {
  const [config, setConfig] = useState(getChatConfig(featureId));
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  // 番組選択状態（null = 未選択、string = 選択済み）
  // initialProgramId が指定されていればそれを初期値に
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    initialProgramId ?? null,
  );

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

  // 番組選択が必要な機能で、まだ番組が選択されていない場合は選択画面を表示
  // initialProgramId が指定されていればスキップ
  if (needsProgramSelection(featureId) && selectedProgramId === null && !initialProgramId) {
    return (
      <ProgramSelectionView
        featureTitle={config.title}
        onSelect={(programId) => setSelectedProgramId(programId)}
      />
    );
  }

  return (
    <FeatureChat
      key={`${config.featureId}-${chatId ?? "new"}-${selectedProgramId ?? "no-program"}`}
      featureId={config.featureId}
      chatId={chatId}
      onChatCreated={onChatCreated}
      title={config.title}
      systemPrompt={systemPrompt}
      placeholder={config.placeholder}
      inputLabel={config.inputLabel}
      outputFormat={config.outputFormat}
      promptSuggestions={config.promptSuggestions}
      selectedProgramId={selectedProgramId}
    />
  );
}
