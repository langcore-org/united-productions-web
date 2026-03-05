"use client";

import { Check, Copy, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getProgramById, programOptions } from "@/lib/knowledge/programs";
import type { Message } from "./FeatureChat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { WordExportButton } from "./WordExportButton";

export interface ChatHeaderProps {
  title: string;
  featureId: string;
  outputFormat: "markdown" | "plaintext";
  hasMessages: boolean;
  lastAssistantMessage: Message | undefined;
  isCopied: boolean;
  selectedProgramId: string | null;
  isStreaming: boolean;
  onClear: () => void;
  onCopy: () => void;
}

export function ChatHeader({
  title,
  featureId,
  outputFormat,
  hasMessages,
  lastAssistantMessage,
  isCopied,
  selectedProgramId,
  isStreaming,
  onClear,
  onCopy,
}: ChatHeaderProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);

  // 現在の番組名を取得（将来的に表示に使用する可能性あり）
  const _currentProgramName = selectedProgramId
    ? (getProgramById(selectedProgramId)?.name ?? "番組未指定")
    : "番組未選択";

  // 番組変更ハンドラ
  const handleProgramChange = (newProgramId: string) => {
    if (newProgramId === selectedProgramId) return;

    setPendingProgramId(newProgramId);
    setIsConfirmOpen(true);
  };

  // 新規タブで開く
  const openInNewTab = () => {
    if (!pendingProgramId) return;

    const url = `/chat?agent=${featureId}&program=${pendingProgramId}`;
    window.open(url, "_blank");
    setIsConfirmOpen(false);
    setPendingProgramId(null);
  };

  // キャンセル
  const handleCancel = () => {
    setIsConfirmOpen(false);
    setPendingProgramId(null);
  };

  // 変更先の番組名
  const pendingProgramName = pendingProgramId
    ? (getProgramById(pendingProgramId)?.name ?? "番組未指定")
    : "";

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900/20 to-gray-600/10 flex items-center justify-center border border-gray-900/20">
            <Sparkles className="w-4 h-4 text-gray-900" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 番組セレクター - 選択済みの場合のみ表示 */}
          {selectedProgramId !== null && (
            <Select
              value={selectedProgramId}
              onValueChange={handleProgramChange}
              disabled={isStreaming}
            >
              <SelectTrigger className="w-[200px] h-8 text-sm border-gray-200 bg-white">
                <SelectValue placeholder="番組を選択" />
              </SelectTrigger>
              <SelectContent>
                {programOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-sm">
                    <span className="flex items-center gap-2">
                      <span className="truncate">{option.label}</span>
                      {option.station && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          ({option.station})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* 確認モーダル */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新規タブで開きますか？</DialogTitle>
            <DialogDescription>
              「{pendingProgramName}」を新規タブで開きます。
              <br />
              現在のチャットはこのタブに残ります。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button onClick={openInNewTab} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              新規タブで開く
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
