"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, Lightbulb } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "何でも聞いてください",
  description = "AIアシスタントがお手伝いします",
  suggestions,
  onSuggestionClick,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-6">
          {icon || <MessageSquare className="w-8 h-8 text-gray-600" />}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-8">{description}</p>

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              おすすめの質問
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
