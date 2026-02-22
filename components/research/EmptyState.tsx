"use client";

import { cn } from "@/lib/utils";
import { Users, MapPin, ShieldCheck } from "lucide-react";
import { ResearchAgentType } from "@/types/research";
import { AGENT_CONFIG } from "@/lib/research/config";
import { EmptyState } from "@/components/ui/EmptyState";

const AGENT_ICONS: Record<ResearchAgentType, typeof Users> = {
  people: Users,
  location: MapPin,
  evidence: ShieldCheck,
};

const SUGGESTIONS: Record<ResearchAgentType, string[]> = {
  people: [
    "東京都内で活動する30代の料理人",
    "SNSで話題の教育系インフルエンサー",
    "元アスリートで現在は解説者の人物",
  ],
  location: [
    "レトロな雰囲気の喫茶店（東京23区内）",
    "海が見える撮影可能な公園",
    "和風の庭園があるホテル",
  ],
  evidence: [
    "最近話題の健康法の科学的根拠",
    "ある統計データの出典確認",
    "歴史上の事実の真偽",
  ],
};

interface ResearchEmptyStateProps {
  agent: ResearchAgentType;
  onSuggestionClick?: (suggestion: string) => void;
}

export function EmptyState({ agent, onSuggestionClick }: ResearchEmptyStateProps) {
  const config = AGENT_CONFIG[agent];
  const Icon = AGENT_ICONS[agent];

  return (
    <EmptyState
      title={config.label}
      description={config.description}
      suggestions={SUGGESTIONS[agent]}
      onSuggestionClick={onSuggestionClick}
      icon={<Icon className="w-8 h-8" style={{ color: config.color }} />}
      iconContainerClassName={cn("bg-gradient-to-br", config.gradient, "border border-white/10")}
      suggestionVariant="list"
      suggestionLabel="おすすめの入力例"
    />
  );
}
