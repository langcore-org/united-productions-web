"use client";

import { useFolderTree } from "@/hooks/useFolderTree";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileType,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { DriveFile, DriveFolder } from "@/lib/google-drive/types";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef } from "react";

// Debounce time for hover prefetch (ms)
const PREFETCH_DEBOUNCE_MS = 200;

export interface SelectedItem {
  id: string;
  name: string;
  type: "file" | "folder";
  mimeType: string;
}

interface SelectableFolderTreeProps {
  workspaceId: string;
  rootFolderId: string | null;
  rootFolderName?: string;
  selectedItems: SelectedItem[];
  onSelectionChange: (items: SelectedItem[]) => void;
  mode?: "file" | "folder"; // "file" allows both files and folders, "folder" only folders
  multiSelect?: boolean;
  maxHeight?: string;
}

// Get appropriate icon and color based on MIME type
function getFileIconInfo(mimeType: string): { icon: typeof File; color: string } {
  if (mimeType === "application/vnd.google-apps.folder") {
    return { icon: Folder, color: "text-yellow-500" };
  }
  if (mimeType === "application/pdf") {
    return { icon: FileType, color: "text-red-500" };
  }
  if (mimeType.startsWith("image/") || mimeType === "application/vnd.google-apps.photo") {
    return { icon: FileImage, color: "text-green-500" };
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType.includes("excel")
  ) {
    return { icon: FileSpreadsheet, color: "text-emerald-500" };
  }
  if (
    mimeType.includes("document") ||
    mimeType === "application/vnd.google-apps.document" ||
    mimeType.includes("word")
  ) {
    return { icon: FileText, color: "text-blue-500" };
  }
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

interface TreeItemProps {
  item: DriveFile | DriveFolder;
  depth: number;
  isFolder: boolean;
  expanded?: boolean;
  loading?: boolean;
  hasChildren?: boolean;
  isSelected: boolean;
  onToggle?: () => void;
  onSelect: (checked: boolean) => void;
  onHover?: () => void;
  children?: React.ReactNode;
}

function SelectableTreeItem({
  item,
  depth,
  isFolder,
  expanded,
  loading,
  hasChildren,
  isSelected,
  onToggle,
  onSelect,
  onHover,
  children,
}: TreeItemProps) {
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { icon: Icon, color: iconColor } = getFileIconInfo(item.mimeType);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.();
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelect(checked);
  };

  // Debounced hover handler for prefetch
  const handleMouseEnter = useCallback(() => {
    if (isFolder && onHover && !expanded) {
      hoverTimerRef.current = setTimeout(() => {
        onHover();
      }, PREFETCH_DEBOUNCE_MS);
    }
  }, [isFolder, onHover, expanded]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors",
          "hover:bg-muted",
          isSelected && "bg-blue-50 dark:bg-blue-950/30"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Expand/Collapse Arrow for folders */}
        {isFolder ? (
          <button
            onClick={handleExpandClick}
            className="w-4 h-4 flex items-center justify-center flex-shrink-0 hover:bg-muted-foreground/20 rounded"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : hasChildren !== false ? (
              expanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )
            ) : null}
          </button>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          className="flex-shrink-0"
        />

        {/* Icon */}
        <Icon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />

        {/* Name */}
        <span className="truncate text-sm flex-1">{item.name}</span>
      </div>

      {/* Children (expanded folders) */}
      {isFolder && expanded && children}
    </div>
  );
}

export function SelectableFolderTree({
  workspaceId,
  rootFolderId,
  rootFolderName,
  selectedItems,
  onSelectionChange,
  mode = "file",
  multiSelect = true,
  maxHeight = "300px",
}: SelectableFolderTreeProps) {
  const { state, rootLoading, rootError, toggleFolder, prefetchFolder } = useFolderTree({
    workspaceId,
    rootFolderId,
    enablePrefetch: true,
  });

  const isItemSelected = (id: string) => selectedItems.some((item) => item.id === id);

  const handleSelect = (item: DriveFile | DriveFolder, type: "file" | "folder", checked: boolean) => {
    if (checked) {
      const newItem: SelectedItem = {
        id: item.id,
        name: item.name,
        type,
        mimeType: item.mimeType,
      };
      if (multiSelect) {
        onSelectionChange([...selectedItems, newItem]);
      } else {
        onSelectionChange([newItem]);
      }
    } else {
      onSelectionChange(selectedItems.filter((s) => s.id !== item.id));
    }
  };

  // Recursive component to render folder contents
  const renderFolderContents = (folderId: string, depth: number) => {
    const folder = state[folderId];

    if (!folder) return null;

    if (folder.loading && !folder.loaded) {
      return (
        <div
          className="flex items-center gap-2 py-2 text-muted-foreground text-sm"
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>読み込み中...</span>
        </div>
      );
    }

    if (folder.error) {
      return (
        <div
          className="flex items-center gap-2 py-2 text-destructive text-sm"
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
        >
          <AlertCircle className="h-3 w-3" />
          <span className="truncate">{folder.error}</span>
        </div>
      );
    }

    if (!folder.expanded) return null;

    const showFiles = mode === "file";
    const items = showFiles ? [...folder.folders, ...folder.files] : folder.folders;

    if (items.length === 0) {
      return (
        <div
          className="py-2 text-muted-foreground text-sm italic"
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
        >
          {showFiles ? "ファイル/フォルダがありません" : "サブフォルダがありません"}
        </div>
      );
    }

    return (
      <div>
        {folder.folders.map((childFolder: DriveFolder) => (
          <SelectableTreeItem
            key={childFolder.id}
            item={childFolder}
            depth={depth}
            isFolder
            expanded={state[childFolder.id]?.expanded}
            loading={state[childFolder.id]?.loading}
            hasChildren={true}
            isSelected={isItemSelected(childFolder.id)}
            onToggle={() => toggleFolder(childFolder.id)}
            onSelect={(checked) => handleSelect(childFolder, "folder", checked)}
            onHover={() => prefetchFolder(childFolder.id)}
          >
            {renderFolderContents(childFolder.id, depth + 1)}
          </SelectableTreeItem>
        ))}
        {showFiles &&
          folder.files.map((file: DriveFile) => (
            <SelectableTreeItem
              key={file.id}
              item={file}
              depth={depth}
              isFolder={false}
              isSelected={isItemSelected(file.id)}
              onToggle={() => {}}
              onSelect={(checked) => handleSelect(file, "file", checked)}
            />
          ))}
      </div>
    );
  };

  if (!rootFolderId) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center border rounded-lg bg-muted/30">
        <Folder className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">ルートフォルダが設定されていません</p>
        <p className="text-xs text-muted-foreground mt-1">
          番組設定でルートフォルダを設定してください
        </p>
      </div>
    );
  }

  if (rootLoading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rootError) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center border rounded-lg">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive">{rootError}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <ScrollArea style={{ height: maxHeight }}>
        <div className="py-2">
          {/* Root folder */}
          <SelectableTreeItem
            item={{
              id: rootFolderId,
              name: rootFolderName || "ルート",
              mimeType: "application/vnd.google-apps.folder",
            }}
            depth={0}
            isFolder
            expanded={state[rootFolderId]?.expanded ?? true}
            loading={state[rootFolderId]?.loading}
            hasChildren={true}
            isSelected={isItemSelected(rootFolderId)}
            onToggle={() => toggleFolder(rootFolderId)}
            onSelect={(checked) =>
              handleSelect(
                { id: rootFolderId, name: rootFolderName || "ルート", mimeType: "application/vnd.google-apps.folder" },
                "folder",
                checked
              )
            }
          >
            {renderFolderContents(rootFolderId, 1)}
          </SelectableTreeItem>
        </div>
      </ScrollArea>
    </div>
  );
}
