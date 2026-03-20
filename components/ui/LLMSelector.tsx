"use client";

import { Brain, ChevronDown, Crown, Search, Sparkles, Zap } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_LABELS, type PROVIDER_CATEGORIES } from "@/lib/llm/constants";
import type { LLMProvider } from "@/lib/llm/types";
import { cn } from "@/lib/utils";

export type { LLMProvider };

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
  category: keyof typeof PROVIDER_CATEGORIES;
  isFree?: boolean;
  isNew?: boolean;
}

// プロバイダー情報を定数として定義（コンポーネント外）
const PROVIDERS: ProviderInfo[] = [
  // { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", description: "最安値・無料枠あり", category: "google", isFree: true },
  // { id: "gemini-3.0-flash", name: "Gemini 3.0 Flash", description: "高品質・無料枠あり", category: "google", isFree: true, isNew: true },
  {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast",
    description: "X検索対応・推論",
    category: "xai",
  },
  // { id: "gpt-4o-mini", name: "GPT-4o-mini", description: "コスパ良好", category: "openai" },
  // { id: "gpt-5", name: "GPT-5", description: "最新フラッグシップ", category: "openai", isNew: true },
  // Claudeモデルは現在未使用（将来追加時に有効化）
  // { id: "claude-sonnet-4.5", name: "Claude 4.5 Sonnet", description: "バランス型", category: "anthropic" },
  // { id: "claude-opus-4.6", name: "Claude Opus 4.6", description: "最高品質", category: "anthropic", isNew: true },
  // { id: "perplexity-sonar", name: "Perplexity Sonar", description: "エビデンス付き検索", category: "perplexity" },
  // { id: "perplexity-sonar-pro", name: "Perplexity Sonar Pro", description: "高品質検索", category: "perplexity" },
];

// カテゴリーグラデーション
const CATEGORY_GRADIENTS: Record<string, string> = {
  google: "from-gray-500/20 to-gray-600/10",
  xai: "from-gray-600/20 to-gray-500/10",
  openai: "from-gray-500/20 to-gray-600/10",
  anthropic: "from-gray-500/20 to-gray-600/10",
  perplexity: "from-gray-500/20 to-gray-600/10",
};

interface ProviderIconProps {
  category: keyof typeof PROVIDER_CATEGORIES;
  className?: string;
}

// ProviderIconコンポーネントをメモ化
const ProviderIcon = memo(function ProviderIcon({ category, className }: ProviderIconProps) {
  const iconProps = { className: cn("w-4 h-4", className) };

  switch (category) {
    case "google":
      return (
        <svg {...iconProps} viewBox="0 0 24 24" fill="currentColor" aria-label="Google Icon">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#6B7280"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#4B5563"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#9CA3AF"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#374151"
          />
        </svg>
      );
    case "xai":
      return <Zap {...iconProps} className={cn("w-4 h-4 text-gray-600", className)} />;
    case "openai":
      return <Brain {...iconProps} className={cn("w-4 h-4 text-gray-600", className)} />;
    case "anthropic":
      return <Crown {...iconProps} className={cn("w-4 h-4 text-gray-600", className)} />;
    case "perplexity":
      return <Search {...iconProps} className={cn("w-4 h-4 text-gray-600", className)} />;
    default:
      return null;
  }
});

export const LLMSelector = memo(function LLMSelector({
  value,
  onChange,
  supportedProviders,
  recommendedProvider,
  className,
}: LLMSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProvider = useMemo(() => PROVIDERS.find((p) => p.id === value), [value]);

  const availableProviders = useMemo(
    () => PROVIDERS.filter((p) => supportedProviders.includes(p.id)),
    [supportedProviders],
  );

  const groupedProviders = useMemo(
    () =>
      availableProviders.reduce(
        (acc, provider) => {
          if (!acc[provider.category]) {
            acc[provider.category] = [];
          }
          acc[provider.category].push(provider);
          return acc;
        },
        {} as Record<ProviderInfo["category"], ProviderInfo[]>,
      ),
    [availableProviders],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProviderSelect = useCallback(
    (providerId: LLMProvider) => {
      onChange(providerId);
      setIsOpen(false);
    },
    [onChange],
  );

  const isRecommended = value === recommendedProvider;

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-2.5 px-4 py-2.5 rounded-xl",
          "bg-white border border-gray-200",
          "hover:border-gray-700/50 hover:bg-gray-50",
          "active:scale-[0.98]",
          "transition-all duration-200 ease-out",
          "text-sm",
          isOpen && "border-gray-700/50 bg-gray-50",
        )}
      >
        {selectedProvider && (
          <div
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg",
              "bg-gradient-to-br",
              CATEGORY_GRADIENTS[selectedProvider.category],
            )}
          >
            <ProviderIcon category={selectedProvider.category} />
          </div>
        )}

        <div className="flex flex-col items-start">
          <span className="font-semibold text-gray-900 leading-tight">
            {selectedProvider?.name}
          </span>
          <span className="text-[10px] text-gray-500 leading-tight">
            {selectedProvider?.description}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-1">
          {selectedProvider?.isFree && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              無料
            </span>
          )}
          {isRecommended && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              <Sparkles className="w-2.5 h-2.5" />
              推奨
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 transition-transform duration-200",
            "group-hover:text-gray-400",
            isOpen && "rotate-180 text-gray-700",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full left-0 mt-2 z-50",
            "w-80 rounded-2xl",
            "bg-white border border-gray-200",
            "shadow-2xl shadow-gray-200/50",
            "overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-150",
          )}
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              モデルを選択
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto py-2">
            {(Object.keys(groupedProviders) as Array<keyof typeof groupedProviders>).map(
              (category, categoryIndex) => (
                <div
                  key={category}
                  className={cn(
                    "mb-1 last:mb-0",
                    categoryIndex !== 0 && "mt-2 pt-2 border-t border-gray-200/50",
                  )}
                >
                  <div className="px-4 py-2 flex items-center gap-2">
                    <ProviderIcon category={category} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                      {CATEGORY_LABELS[category]}
                    </span>
                  </div>

                  {groupedProviders[category].map((provider) => {
                    const isSelected = value === provider.id;
                    const isProviderRecommended = provider.id === recommendedProvider;

                    return (
                      <button
                        type="button"
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-xl",
                          "hover:bg-gray-100/70 transition-all duration-150",
                          "text-left",
                          isSelected && "bg-gray-100 hover:bg-gray-100",
                        )}
                        style={{ width: "calc(100% - 16px)" }}
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200",
                            isSelected ? "bg-gray-700 scale-100" : "bg-transparent scale-75",
                          )}
                          style={{
                            backgroundColor: isSelected ? "#374151" : "#9CA3AF",
                            opacity: isSelected ? 1 : 0.4,
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                isSelected ? "text-gray-900" : "text-gray-600",
                              )}
                            >
                              {provider.name}
                            </span>

                            {provider.isNew && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                NEW
                              </span>
                            )}
                            {provider.isFree && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                無料
                              </span>
                            )}
                            {isProviderRecommended && (
                              <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                <Sparkles className="w-2.5 h-2.5" />
                                推奨
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{provider.description}</span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-gray-700"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                              aria-label="Selected"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ),
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-gray-600" />
                <span>推奨モデル</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-500/50" />
                <span>無料枠あり</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default LLMSelector;
