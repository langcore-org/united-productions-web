"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  AGENTS,
  getAgentById,
  isProposalAgent,
  updateProposalSystemPrompt,
} from "@/lib/chat/agents";

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

/**
 * 統合チャットページ
 *
 * クエリパラメータ ?agent=xxx で機能を指定
 * 指定がない場合は一般チャット
 */
function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = searchParams.get("agent") || "general";
  // chatId指定なし = 新規チャット、指定あり = 既存チャットの続き
  const chatId = searchParams.get("chatId") ?? undefined;

  const [agent, setAgent] = useState(AGENTS[0]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAgent() {
      setIsLoading(true);

      try {
        const selectedAgent = getAgentById(agentId as Parameters<typeof getAgentById>[0]);
        setAgent(selectedAgent);

        if (isProposalAgent(selectedAgent.id)) {
          const response = await fetch("/api/settings/program");
          if (response.ok) {
            const data = await response.json();
            const updatedAgent = updateProposalSystemPrompt(
              selectedAgent,
              data.programInfo || "",
              data.pastProposals || "",
            );
            setSystemPrompt(updatedAgent.systemPrompt);
          } else {
            setSystemPrompt(selectedAgent.systemPrompt);
          }
        } else {
          setSystemPrompt(selectedAgent.systemPrompt);
        }
      } catch (error) {
        console.error("Failed to load agent:", error);
        setAgent(AGENTS[0]);
        setSystemPrompt(AGENTS[0].systemPrompt);
      } finally {
        setIsLoading(false);
      }
    }

    loadAgent();
  }, [agentId]);

  // 新規チャット作成時にURLを更新（ブラウザ履歴を汚さないようreplaceState）
  const handleChatCreated = useCallback(
    (newChatId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("chatId", newChatId);
      router.replace(`/chat?${params.toString()}`);
    },
    [searchParams, router],
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
      key={`${agent.id}-${chatId ?? "new"}`}
      featureId={agent.id}
      chatId={chatId}
      onChatCreated={handleChatCreated}
      title={agent.name}
      systemPrompt={systemPrompt}
      placeholder={agent.placeholder}
      inputLabel={agent.inputLabel}
      outputFormat={agent.outputFormat}
    />
  );
}

export default function ChatPage() {
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
