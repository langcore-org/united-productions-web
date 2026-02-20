"use client";

import { useState } from "react";
import { BrainCircuit, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export interface ReasoningStep {
  step: number;
  content: string;
  tokens?: number;
}

interface ReasoningStepsProps {
  steps: ReasoningStep[];
  totalTokens?: number;
  className?: string;
}

export function ReasoningSteps({ steps, totalTokens, className = "" }: ReasoningStepsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (steps.length === 0) return null;
  
  const latestStep = steps[steps.length - 1];
  
  return (
    <div className={`rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-purple-600" />
          </div>
          <span className="text-sm font-medium text-purple-900">
            思考プロセス
          </span>
          {totalTokens && (
            <span className="text-xs text-purple-600">
              ({totalTokens.toLocaleString()} トークン)
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-purple-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-600" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="flex gap-3 p-2 rounded bg-white/50 border border-purple-100/50"
            >
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700">
                {step.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{step.content}</p>
                {step.tokens && (
                  <p className="text-xs text-gray-500 mt-1">
                    {step.tokens.toLocaleString()} トークン
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!isExpanded && latestStep && (
        <div className="px-3 pb-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {latestStep.content}
          </p>
        </div>
      )}
    </div>
  );
}

interface ThinkingIndicatorProps {
  isThinking: boolean;
  reasoningTokens?: number;
  className?: string;
}

export function ThinkingIndicator({ 
  isThinking, 
  reasoningTokens, 
  className = "" 
}: ThinkingIndicatorProps) {
  if (!isThinking) return null;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-full bg-purple-100 text-purple-700 text-sm ${className}`}>
      <BrainCircuit className="w-4 h-4 animate-pulse" />
      <span>思考中</span>
      {reasoningTokens && (
        <span className="text-xs text-purple-600">
          ({reasoningTokens.toLocaleString()} トークン)
        </span>
      )}
      <div className="flex gap-0.5">
        <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
