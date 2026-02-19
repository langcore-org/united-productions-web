"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FeatureChat } from "@/components/ui/FeatureChat";
import { getGemById, GEMS, isProposalGem } from "@/lib/chat/gems";
import { getProposalSystemPrompt } from "@/lib/prompts/proposal";
import { Sparkles, Users, MapPin, Search, Shield, FileText, Lightbulb, Mic } from "lucide-react";

/**
 * 統合チャットページ
 * 
 * クエリパラメータ ?gem=xxx で機能を指定
 * 指定がない場合は一般チャット
 */
function ChatPageContent() {
  const searchParams = useSearchParams();
  const gemId = searchParams.get("gem") || "general";
  
  const [gem, setGem] = useState(GEMS[0]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

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
            const prompt = getProposalSystemPrompt(
              data.programInfo || "",
              data.pastProposals || ""
            );
            setSystemPrompt(prompt);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <FeatureChat
      featureId={gem.id}
      title={gem.name}
      systemPrompt={systemPrompt}
      placeholder={gem.placeholder}
      inputLabel={gem.inputLabel}
      outputFormat={gem.outputFormat}
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
