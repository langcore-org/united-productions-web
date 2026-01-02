"use client";

import { AGENT_MODES, AgentMode } from "@/lib/modes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModeSelectorProps {
  open: boolean;
  selectedMode: string;
  onModeSelect: (mode: AgentMode) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ModeSelector({
  open,
  selectedMode,
  onModeSelect,
  onCancel,
  onConfirm,
}: ModeSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Agentモードを選択</DialogTitle>
          <DialogDescription>
            チャットの目的に合わせてAgentモードを選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[50vh] py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onModeSelect(mode)}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  selectedMode === mode.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mode.icon}</span>
                  <div>
                    <div className="font-medium">{mode.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {mode.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button onClick={onConfirm}>チャット開始</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
