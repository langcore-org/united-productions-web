"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Users, MapPin, ShieldCheck, Zap } from "lucide-react";
import { ResearchAgentType } from "@/types/research";
import { AGENT_CONFIG } from "@/lib/research/config";

const AGENT_ICONS: Record<ResearchAgentType, typeof Users> = {
  people: Users,
  location: MapPin,
  evidence: ShieldCheck,
};

interface EmptyStateProps {
  agent: ResearchAgentType;
  onSuggestionClick?: (suggestion: string) => void;
}

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

export function EmptyState({ agent, onSuggestionClick }: EmptyStateProps) {
  const config = AGENT_CONFIG[agent];
  const Icon = AGENT_ICONS[agent];
  const suggestions = SUGGESTIONS[agent];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      {/* Icon */}
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
          "bg-gradient-to-br",
          config.gradient,
          "border border-white/10"
        )}
      >
        <Icon className="w-8 h-8" style={{ color: config.color }} />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{config.label}</h3>

      {/* Description */}
      <p className="text-sm text-gray-500 text-center max-w-sm mb-8">
        {config.description}
      </p>

      {/* Suggestions */}
      <div className="w-full max-w-md space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>おすすめの入力例</span>
        </div>

        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick?.(suggestion)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
              <Zap className="w-3 h-3 text-gray-500 group-hover:text-black transition-colors" />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-900">
              {suggestion}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
