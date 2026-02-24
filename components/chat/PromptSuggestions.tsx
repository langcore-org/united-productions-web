"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PromptSuggestion {
  id: string;
  text: string;
}

interface PromptSuggestionsProps {
  suggestions: PromptSuggestion[];
  onSuggestionClick: (text: string) => void;
  className?: string;
}

export function PromptSuggestions({
  suggestions,
  onSuggestionClick,
  className,
}: PromptSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          onClick={() => onSuggestionClick(suggestion.text)}
          className={cn(
            "w-full text-left group flex items-center justify-between",
            "px-4 py-3 rounded-xl",
            "bg-gray-50 hover:bg-gray-100",
            "border border-gray-200 hover:border-gray-300",
            "transition-all duration-200",
            "text-sm text-gray-700 hover:text-gray-900",
          )}
        >
          <span className="flex-1 pr-3 leading-relaxed">{suggestion.text}</span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
        </button>
      ))}
    </div>
  );
}
