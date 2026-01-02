"use client";

import { useState, useRef, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileType,
  RefreshCw,
  Loader2,
  Trash2,
} from "lucide-react";
import type { DriveFile, DriveFolder } from "@/lib/google-drive/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Debounce time for hover prefetch (ms)
const PREFETCH_DEBOUNCE_MS = 200;

interface FolderTreeItemProps {
  item: DriveFile | DriveFolder;
  depth: number;
  isFolder: boolean;
  expanded?: boolean;
  loading?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  onReload?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
  onHover?: () => void; // Pre-fetch on hover
  onDelete?: () => Promise<void>; // Delete file
  canDelete?: boolean; // Whether user can delete files
  children?: React.ReactNode;
}

// Get appropriate icon and color based on MIME type
function getFileIconInfo(mimeType: string): { icon: typeof File; color: string } {
  if (mimeType === "application/vnd.google-apps.folder") {
    return { icon: Folder, color: "text-yellow-500" };
  }
  // PDF - red
  if (mimeType === "application/pdf") {
    return { icon: FileType, color: "text-red-500" };
  }
  // Images - green
  if (mimeType.startsWith("image/") || mimeType === "application/vnd.google-apps.photo") {
    return { icon: FileImage, color: "text-green-500" };
  }
  // Spreadsheets - emerald
  if (
    mimeType.includes("spreadsheet") ||
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType.includes("excel")
  ) {
    return { icon: FileSpreadsheet, color: "text-emerald-500" };
  }
  // Documents - blue
  if (
    mimeType.includes("document") ||
    mimeType === "application/vnd.google-apps.document" ||
    mimeType.includes("word")
  ) {
    return { icon: FileText, color: "text-blue-500" };
  }
  // Code files - purple
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("html") ||
    mimeType.includes("css") ||
    mimeType.includes("typescript")
  ) {
    return { icon: FileCode, color: "text-purple-500" };
  }
  return { icon: File, color: "text-muted-foreground" };
}

export function FolderTreeItem({
  item,
  depth,
  isFolder,
  expanded,
  loading,
  hasChildren,
  onToggle,
  onReload,
  onDragStart,
  onClick,
  onHover,
  onDelete,
  canDelete = false,
  children,
}: FolderTreeItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { icon: Icon, color: iconColor } = getFileIconInfo(item.mimeType);

  const handleClick = () => {
    if (isFolder && onToggle) {
      onToggle();
    } else if (!isFolder && onClick) {
      onClick();
    }
  };

  const handleReloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReload) {
      onReload();
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Debounced hover handler for prefetch
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Trigger prefetch after debounce (only for folders)
    if (isFolder && onHover && !expanded) {
      hoverTimerRef.current = setTimeout(() => {
        onHover();
      }, PREFETCH_DEBOUNCE_MS);
    }
  }, [isFolder, onHover, expanded]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Cancel pending prefetch
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted",
          isHovered && !isFolder && "bg-muted/50"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        draggable={!isFolder}
        onDragStart={onDragStart}
      >
        {/* Expand/Collapse Arrow for folders */}
        {isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : hasChildren !== false ? (
              expanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )
            ) : null}
          </span>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Icon */}
        <Icon
          className={cn("h-4 w-4 flex-shrink-0", iconColor)}
        />

        {/* Name with reload button inline for folders */}
        <span className="truncate text-sm">{item.name}</span>

        {/* Reload button for folders (inline after name) */}
        {isFolder && isHovered && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 opacity-70 hover:opacity-100"
            onClick={handleReloadClick}
            title="Reload"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {/* Spacer to push delete button to right */}
        <span className="flex-1" />

        {/* Action buttons (on hover) */}
        {isHovered && (
          <div className="flex items-center gap-0.5">
            {/* Delete button for files (with confirmation) */}
            {!isFolder && canDelete && onDelete && (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-70 hover:opacity-100 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialogOpen(true);
                    }}
                    title="Delete"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ファイルを削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      「{item.name}」を削除します。この操作は取り消せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          削除中...
                        </>
                      ) : (
                        "削除"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {/* Children (expanded folders) */}
      {isFolder && expanded && children}
    </div>
  );
}
