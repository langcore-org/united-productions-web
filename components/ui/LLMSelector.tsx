"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

export type LLMProvider =
  | "gemini-2.5-flash-lite"
  | "gemini-3.0-flash"
  | "grok-4.1-fast"
  | "grok-4"
  | "gpt-4o-mini"
  | "gpt-5"
  | "claude-sonnet-4.5"
  | "claude-opus-4.6"
  | "perplexity-sonar"
  | "perplexity-sonar-pro";

interface LLMSelectorProps {
  value: LLMProvider;
  onChange: (provider: LLMProvider) => void;
  supportedProviders: LLMProvider[];
  recommendedProvider?: LLMProvider;
  className?: string;
}

interface ProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  category: "google" | "xai" | "openai" | "anthropic" | "perplexity";
  isFree?: boolean;
}

const providers: ProviderInfo[] = [
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    description: "最安値・無料枠あり",
    category: "google",
    isFree: true,
  },
  {
    id: "gemini-3.0-flash",
    name: "Gemini 3.0 Flash",
    description: "高品質・無料枠あり",
    category: "google",
    isFree: true,
  },
  {
    id: "grok-4.1-fast",
    name: "Grok 4.1 Fast",
    description: "X検索対応",
    category: "xai",
  },
  {
    id: "grok-4",
    name: "Grok 4",
    description: "最高品質",
    category: "xai",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o-mini",
    description: "コスパ良好",
    category: "openai",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    description: "最新フラッグシップ",
    category: "openai",
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude 4.5 Sonnet",
    description: "バランス型",
    category: "anthropic",
  },
  {
    id: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    description: "最高品質",
    category: "anthropic",
  },
  {
    id: "perplexity-sonar",
    name: "Perplexity Sonar",
    description: "エビデンス付き検索",
    category: "perplexity",
  },
  {
    id: "perplexity-sonar-pro",
    name: "Perplexity Sonar Pro",
    description: "高品質検索",
    category: "perplexity",
  },
];

const categoryColors: Record<ProviderInfo["category"], string> = {
  google: "#4285f4",
  xai: "#ff6b00",
  openai: "#10a37f",
  anthropic: "#d4a574",
  perplexity: "#22c55e",
};

const categoryLabels: Record<ProviderInfo["category"], string> = {
  google: "Google",
  xai: "xAI",
  openai: "OpenAI",
  anthropic: "Anthropic",
  perplexity: "Perplexity",
};

export function LLMSelector({
  value,
  onChange,
  supportedProviders,
  recommendedProvider,
  className,
}: LLMSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedProvider = providers.find((p) => p.id === value);
  const availableProviders = providers.filter((p) =>
    supportedProviders.includes(p.id)
  );

  const groupedProviders = availableProviders.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<ProviderInfo["category"], ProviderInfo[]>);

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-[#1a1a24] border border-[#2a2a35]",
          "hover:border-[#ff6b00]/50 transition-colors",
          "text-sm text-gray-200"
        )}
      >
        {selectedProvider && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: categoryColors[selectedProvider.category] }}
          />
        )}
        <span className="font-medium">{selectedProvider?.name}</span>
        {selectedProvider?.isFree && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
            無料
          </span>
        )}
        {value === recommendedProvider && (
          <Sparkles className="w-3.5 h-3.5 text-[#ff6b00]" />
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "absolute top-full left-0 mt-1 z-50",
              "w-72 rounded-xl",
              "bg-[#1a1a24] border border-[#2a2a35]",
              "shadow-xl shadow-black/50",
              "py-2"
            )}
          >
            {(
              Object.keys(groupedProviders) as ProviderInfo["category"][]
            ).map((category) => (
              <div key={category} className="mb-2 last:mb-0">
                <div className="px-3 py-1.5">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: categoryColors[category] }}
                  >
                    {categoryLabels[category]}
                  </span>
                </div>
                {groupedProviders[category].map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      onChange(provider.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2",
                      "hover:bg-[#2a2a35] transition-colors",
                      "text-left",
                      value === provider.id && "bg-[#2a2a35]/50"
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[category] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-200 font-medium truncate">
                          {provider.name}
                        </span>
                        {provider.isFree && (
                          <span className="text-xs px-1 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">
                            無料
                          </span>
                        )}
                        {provider.id === recommendedProvider && (
                          <Sparkles className="w-3 h-3 text-[#ff6b00] flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {provider.description}
                      </span>
                    </div>
                    {value === provider.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
