"use client";

import { MessageSquare, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  icon?: React.ReactNode;
  /** アイコンコンテナのTailwindクラス（デフォルト: bg-gray-100） */
  iconContainerClassName?: string;
  /** サジェストのレイアウト */
  suggestionVariant?: "chip" | "list";
  /** サジェストセクションのラベル */
  suggestionLabel?: string;
}

export function EmptyState({
  title = "何でも聞いてください",
  description = "AIアシスタントがお手伝いします",
  suggestions,
  onSuggestionClick,
  icon,
  iconContainerClassName,
  suggestionVariant = "chip",
  suggestionLabel = "おすすめの質問",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div
          className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6",
            iconContainerClassName ?? "bg-gray-100",
          )}
        >
          {icon || <MessageSquare className="w-8 h-8 text-gray-600" />}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-8">{description}</p>

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestionVariant === "chip" ? (
              <>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {suggestionLabel}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => onSuggestionClick?.(suggestion)}
                      className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{suggestionLabel}</span>
                </div>
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
