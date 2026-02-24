"use client";

import { Check, Copy, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "./FeatureChat";
import { ProgramSelector } from "./ProgramSelector";
import { WordExportButton } from "./WordExportButton";

export interface ChatHeaderProps {
  title: string;
  featureId: string;
  outputFormat: "markdown" | "plaintext";
  hasMessages: boolean;
  lastAssistantMessage: Message | undefined;
  isCopied: boolean;
  onClear: () => void;
  onCopy: () => void;
  /** 番組選択機能を有効化 */
  enableProgramSelector?: boolean;
  /** 選択中の番組ID */
  selectedProgramId?: string;
  /** 番組選択時のコールバック */
  onProgramChange?: (programId: string) => void;
  /** 番組選択無効化状態 */
  isProgramSelectorDisabled?: boolean;
}

export function ChatHeader({
  title,
  featureId,
  outputFormat,
  hasMessages,
  lastAssistantMessage,
  isCopied,
  onClear,
  onCopy,
  enableProgramSelector = false,
  selectedProgramId = "all",
  onProgramChange,
  isProgramSelectorDisabled = false,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900/20 to-gray-600/10 flex items-center justify-center border border-gray-900/20">
          <Sparkles className="w-4 h-4 text-gray-900" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {enableProgramSelector && onProgramChange && (
          <ProgramSelector
            value={selectedProgramId}
            onChange={onProgramChange}
            disabled={isProgramSelectorDisabled}
          />
        )}

        <div className="flex items-center gap-2">
          {hasMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-gray-500 hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              クリア
            </Button>
          )}

          {outputFormat === "plaintext" && lastAssistantMessage && (
            <>
              <WordExportButton
                content={lastAssistantMessage.content}
                filename={`${featureId}_${new Date().toISOString().split("T")[0]}`}
                title={title}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onCopy}
                className="gap-2 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    コピー
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
