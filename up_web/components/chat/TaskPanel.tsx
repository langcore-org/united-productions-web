"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Circle,
  Loader2,
  CheckCircle2,
  FileText,
  Eye,
  Upload,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  CloudUpload,
  CheckCircle,
  Search,
} from "lucide-react";
import type { Todo, GeneratedFile, SessionStatus } from "@/lib/agent/types";

interface TaskPanelProps {
  todos: Todo[];
  generatedFiles: GeneratedFile[];
  sessionStatus: SessionStatus;
  onFilePreview?: (file: GeneratedFile) => void;
  onExportToDrive?: (files: GeneratedFile[]) => void;
  onFileUpdated?: (fileId: string, updates: Partial<GeneratedFile>) => void;
  workspaceId?: string;
  outputFolderId?: string;
  className?: string;
}

type TabType = "tasks" | "files";

const todoStatusIcons: Record<Todo["status"], React.ElementType> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
};

const todoStatusColors: Record<Todo["status"], string> = {
  pending: "text-muted-foreground",
  in_progress: "text-blue-600",
  completed: "text-green-600",
};

export function TaskPanel({
  todos,
  generatedFiles,
  sessionStatus,
  onFilePreview,
  onExportToDrive,
  onFileUpdated,
  workspaceId,
  outputFolderId,
  className,
}: TaskPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lookupInProgress, setLookupInProgress] = useState<Set<string>>(new Set());
  const lookedUpFilesRef = useRef<Set<string>>(new Set());

  // Debug: Log when todos prop changes
  useEffect(() => {
    console.log("[TaskPanel] todos prop received:", todos.length, "todos", sessionStatus);
  }, [todos, sessionStatus]);

  // Auto-lookup files with needsLookup flag
  const lookupFile = useCallback(async (file: GeneratedFile) => {
    if (!workspaceId || !outputFolderId || !onFileUpdated) {
      console.log("[TaskPanel] Cannot lookup file - missing workspaceId, outputFolderId, or onFileUpdated");
      return;
    }

    // Skip if already looked up or lookup in progress
    if (lookedUpFilesRef.current.has(file.id)) {
      console.log("[TaskPanel] File already looked up:", file.name);
      return;
    }

    setLookupInProgress(prev => new Set(prev).add(file.id));
    lookedUpFilesRef.current.add(file.id);

    try {
      console.log("[TaskPanel] Looking up file:", file.name);
      const response = await fetch(
        `/api/workspace/drive/lookup?workspaceId=${encodeURIComponent(workspaceId)}&folderId=${encodeURIComponent(outputFolderId)}&fileName=${encodeURIComponent(file.name)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.found && data.file) {
          console.log("[TaskPanel] File found:", data.file.id);
          onFileUpdated(file.id, {
            driveId: data.file.id,
            driveUrl: data.file.webViewLink,
            needsLookup: false,
          });
        } else {
          console.log("[TaskPanel] File not found in Drive:", file.name);
        }
      } else {
        console.log("[TaskPanel] Lookup failed:", response.status);
      }
    } catch (error) {
      console.error("[TaskPanel] Error looking up file:", error);
    } finally {
      setLookupInProgress(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  }, [workspaceId, outputFolderId, onFileUpdated]);

  // Trigger lookup for files without driveId
  // This handles both new files with needsLookup flag and existing files loaded from DB
  useEffect(() => {
    for (const file of generatedFiles) {
      if (!file.driveId && !lookupInProgress.has(file.id)) {
        lookupFile(file);
      }
    }
  }, [generatedFiles, lookupFile, lookupInProgress]);

  const completedCount = todos.filter((t) => t.status === "completed").length;
  const totalCount = todos.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const hasNewFiles = generatedFiles.length > 0;

  return (
    <div
      className={cn(
        "border rounded-lg bg-card overflow-hidden",
        className
      )}
    >
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "px-3 py-1 text-sm rounded-md transition-colors",
              activeTab === "tasks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            タスク
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={cn(
              "px-3 py-1 text-sm rounded-md transition-colors relative",
              activeTab === "files"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            ファイル
            {hasNewFiles && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {generatedFiles.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "tasks" && totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              進捗: {completedCount}/{totalCount}
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-muted rounded"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="max-h-[200px] overflow-y-auto">
          {activeTab === "tasks" && (
            <div className="p-3">
              {/* Progress bar */}
              {totalCount > 0 && (
                <div className="mb-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        progressPercent === 100
                          ? "bg-green-500"
                          : "bg-blue-500"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {Math.round(progressPercent)}%
                  </p>
                </div>
              )}

              {/* Todo list */}
              <ScrollArea className="max-h-[120px]">
                <ul className="space-y-1.5">
                  {todos.map((todo, index) => {
                    // Only show spinning animation if agent is actually running
                    const isAgentRunning = sessionStatus === "running" || sessionStatus === "reconnecting";
                    const showSpinner = todo.status === "in_progress" && isAgentRunning;
                    const Icon = showSpinner ? Loader2 : (todo.status === "in_progress" ? Circle : todoStatusIcons[todo.status]);
                    const color = showSpinner ? todoStatusColors.in_progress : (todo.status === "in_progress" && !isAgentRunning ? "text-amber-500" : todoStatusColors[todo.status]);
                    return (
                      <li
                        key={todo.id || `todo-${index}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 mt-0.5 shrink-0",
                            color,
                            showSpinner && "animate-spin"
                          )}
                        />
                        <span
                          className={cn(
                            todo.status === "completed" &&
                              "text-muted-foreground line-through"
                          )}
                        >
                          {todo.status === "in_progress" && todo.activeForm
                            ? todo.activeForm
                            : todo.content}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>

              {todos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  タスクはまだありません
                </p>
              )}
            </div>
          )}

          {activeTab === "files" && (
            <div className="p-3">
              <ScrollArea className="max-h-[120px]">
                <ul className="space-y-2">
                  {generatedFiles.map((file) => {
                    const isLookingUp = lookupInProgress.has(file.id);
                    const canPreview = onFilePreview && file.driveId;
                    return (
                    <li
                      key={file.id}
                      className={cn(
                        "flex items-center justify-between gap-2 text-sm p-2 rounded-md bg-muted/50",
                        canPreview && "cursor-pointer hover:bg-muted transition-colors"
                      )}
                      onClick={() => {
                        if (canPreview) {
                          onFilePreview({
                            ...file,
                            id: file.driveId || file.id,
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate flex-1">{file.name}</span>
                        {/* Lookup indicator */}
                        {isLookingUp && (
                          <span title="ファイルを検索中">
                            <Search className="h-3 w-3 shrink-0 text-blue-500 animate-pulse" />
                          </span>
                        )}
                        {/* Upload status indicator */}
                        {!isLookingUp && file.uploadStatus === 'pending' && (
                          <span title="アップロード待機中">
                            <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </span>
                        )}
                        {!isLookingUp && file.uploadStatus === 'uploading' && (
                          <span title="アップロード中">
                            <CloudUpload className="h-3 w-3 shrink-0 text-blue-500 animate-pulse" />
                          </span>
                        )}
                        {!isLookingUp && file.uploadStatus === 'completed' && (
                          <span title="アップロード完了">
                            <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
                          </span>
                        )}
                        {!isLookingUp && file.uploadStatus === 'error' && (
                          <span title={file.uploadError || "アップロードエラー"}>
                            <AlertCircle className="h-3 w-3 shrink-0 text-destructive" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Open in Drive button (only for uploaded files) */}
                        {file.driveUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(file.driveUrl, '_blank');
                            }}
                            title="Google Driveで開く"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Preview button */}
                        {canPreview && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFilePreview({
                                ...file,
                                id: file.driveId || file.id,
                              });
                            }}
                            title="プレビュー"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </ScrollArea>

              {generatedFiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  生成されたファイルはまだありません
                </p>
              )}

              {/* Export button (only show if files haven't been uploaded) */}
              {generatedFiles.length > 0 &&
               onExportToDrive &&
               generatedFiles.some(f => !f.uploadStatus || f.uploadStatus === 'error') && (
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onExportToDrive(generatedFiles.filter(f => !f.uploadStatus || f.uploadStatus === 'error'))}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Google Driveに出力
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
