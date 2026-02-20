"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Sparkles, Zap, Brain, Bot } from "lucide-react";
import type { LLMProvider } from "@/lib/llm/types";
import { PROVIDER_LABELS } from "@/lib/llm/constants";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";

interface ModelInfo {
  id: LLMProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  isRecommended?: boolean;
  isNew?: boolean;
}

const PRIMARY_MODELS: ModelInfo[] = [
  {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast",
    description: "xAI - 高性能で直感的な応答",
    icon: <Sparkles className="w-4 h-4" />,
    isRecommended: true,
  },
  {
    id: "gemini-3.0-flash",
    name: "Gemini 3.0 Flash",
    description: "Google - マルチモーダル対応",
    icon: <Brain className="w-4 h-4" />,
  },
  {
    id: "perplexity-sonar-pro",
    name: "Perplexity Pro",
    description: "最新情報を含む検索対応",
    icon: <Zap className="w-4 h-4" />,
  },
];

const OTHER_MODELS: ModelInfo[] = [
  {
    id: "claude-sonnet-4.5",
    name: "Claude 4.5 Sonnet",
    description: "Anthropic - 長文理解に強い",
    icon: <Bot className="w-4 h-4" />,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    description: "OpenAI - 高い汎用性",
    icon: <Bot className="w-4 h-4" />,
  },
];

interface ModelSelectorProps {
  value: LLMProvider;
  onChange: (provider: LLMProvider) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const currentModel = [...PRIMARY_MODELS, ...OTHER_MODELS].find(
    (m) => m.id === value
  ) || PRIMARY_MODELS[0];


  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 px-3 gap-2 border-gray-200 bg-white hover:bg-gray-50 transition-all",
            className
          )}
        >
          <span className="text-gray-600">{currentModel.icon}</span>
          <span className="text-sm text-gray-700">{currentModel.name}</span>
          {value === DEFAULT_PROVIDER && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              標準
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 bg-white border-gray-200 p-2"
      >
        {/* Primary Models */}
        <div className="space-y-1">
          {PRIMARY_MODELS.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => {
                onChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all",
                value === model.id
                  ? "bg-gray-100 border border-gray-200"
                  : "hover:bg-gray-100 border border-transparent"
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600">
                {model.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {model.name}
                  </span>
                  {model.isRecommended && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      推奨
                    </span>
                  )}
                  {model.isNew && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="my-2 bg-gray-200" />

        {/* Other Models */}
        <div className="px-2 pb-1">
          <p className="text-xs text-gray-500 mb-2">その他のモデル</p>
          <div className="space-y-1">
            {OTHER_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-2 rounded cursor-pointer",
                  value === model.id
                    ? "bg-gray-100 text-gray-800"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                )}
              >
                <span className="text-gray-600">
                  {model.icon}
                </span>
                <span className="text-sm">{model.name}</span>
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModelSelector;
