"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FollowUpSuggestion {
  id: string;
  text: string;
}

interface FollowUpSuggestionsProps {
  suggestions: FollowUpSuggestion[];
  onSuggestionClick: (text: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function FollowUpSuggestions({
  suggestions,
  onSuggestionClick,
  isLoading = false,
  className,
}: FollowUpSuggestionsProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-xs text-gray-400 mb-3">フォローアップ</p>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-gray-400 mb-3">フォローアップ</p>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <button
            type="button"
            key={suggestion.id}
            onClick={() => onSuggestionClick(suggestion.text)}
            className={cn(
              "w-full text-left group flex items-center gap-3",
              "px-4 py-3 rounded-xl",
              "bg-transparent hover:bg-gray-50",
              "border border-transparent hover:border-gray-200",
              "transition-all duration-200",
              "text-sm text-gray-600 hover:text-gray-900",
            )}
          >
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
            <span className="flex-1 leading-relaxed">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
