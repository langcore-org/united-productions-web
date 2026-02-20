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
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/lib/llm/constants";
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

  const currentColor = PROVIDER_COLORS[value] || "#ff6b00";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 px-3 gap-2 border-[#2a2a35] bg-[#1e1e24] hover:bg-[#2a2a35] transition-all",
            className
          )}
        >
          <span style={{ color: currentColor }}>{currentModel.icon}</span>
          <span className="text-sm text-gray-300">{currentModel.name}</span>
          {value === DEFAULT_PROVIDER && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff6b00]/20 text-[#ff6b00]">
              標準
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 bg-[#1e1e24] border-[#2a2a35] p-2"
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
                  ? "bg-[#ff6b00]/10 border border-[#ff6b00]/30"
                  : "hover:bg-[#2a2a35] border border-transparent"
              )}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[#2a2a35]"
                style={{ color: PROVIDER_COLORS[model.id] || "#ff6b00" }}
              >
                {model.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">
                    {model.name}
                  </span>
                  {model.isRecommended && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                      推奨
                    </span>
                  )}
                  {model.isNew && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="my-2 bg-[#2a2a35]" />

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
                    ? "bg-[#2a2a35] text-gray-200"
                    : "text-gray-400 hover:bg-[#2a2a35] hover:text-gray-200"
                )}
              >
                <span style={{ color: PROVIDER_COLORS[model.id] || "#666" }}>
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
