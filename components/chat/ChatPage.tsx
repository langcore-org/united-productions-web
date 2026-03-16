"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { PromptSuggestion } from "@/components/chat/PromptSuggestions";
import { type ChatFeatureId, getChatConfig } from "@/lib/chat/chat-config";
import { needsProgramSelection } from "@/lib/chat/welcome-messages";
import { getProgramById } from "@/lib/knowledge/programs";
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
  /** 初期メッセージ（指定時は自動送信） */
  initialMessage?: string;
  onChatCreated?: (chatId: string) => void;
}

export function ChatPage({
  featureId,
  chatId,
  initialProgramId,
  initialMessage,
  onChatCreated,
}: ChatPageProps) {
  const [config, setConfig] = useState(getChatConfig(featureId));
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  // 番組選択状態（null = 未選択、string = 選択済み）
  // initialProgramId が指定されていればそれを初期値に
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    initialProgramId ?? null,
  );

  // 選択された番組に応じた動的サジェストを生成
  const dynamicPromptSuggestions = useMemo<PromptSuggestion[] | undefined>(() => {
    if (!config.promptSuggestions) return undefined;

    // research-cast 機能のみ、番組名を動的に埋め込む
    if (featureId === "research-cast" && selectedProgramId && selectedProgramId !== "all") {
      const program = getProgramById(selectedProgramId);
      if (program) {
        return config.promptSuggestions.map((suggestion) => {
          // 3番目のサジェスト（id: "3"）のみ番組名を動的に変更
          if (suggestion.id === "3") {
            return {
              ...suggestion,
              text: `過去の「${program.name}」で高視聴率を記録した回の傾向を分析して、成功パターンを表にまとめてください`,
            };
          }
          return suggestion;
        });
      }
    }

    return config.promptSuggestions;
  }, [config.promptSuggestions, featureId, selectedProgramId]);

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
        featureId={featureId}
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
      promptSuggestions={dynamicPromptSuggestions}
      selectedProgramId={selectedProgramId}
      initialMessage={initialMessage}
    />
  );
}
