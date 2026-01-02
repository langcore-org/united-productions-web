"use client";

import { useFolderTree } from "@/hooks/useFolderTree";
import { FolderTreeItem } from "./FolderTreeItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, AlertCircle, Loader2 } from "lucide-react";
import type { DriveFile, DriveFolder } from "@/lib/google-drive/types";

interface FolderTreeProps {
  workspaceId: string;
  rootFolderId: string | null;
  rootFolderName?: string;
  onFileDragStart?: (file: DriveFile, e: React.DragEvent) => void;
  onFileSelect?: (file: DriveFile) => void;
  canDelete?: boolean; // Whether user can delete files (admin/owner only)
}

export function FolderTree({
  workspaceId,
  rootFolderId,
  rootFolderName,
  onFileDragStart,
  onFileSelect,
  canDelete = false,
}: FolderTreeProps) {
  const { state, rootLoading, rootError, toggleFolder, reloadFolder, prefetchFolder, deleteFile } =
    useFolderTree({
      workspaceId,
      rootFolderId,
      enablePrefetch: true,
    });

  // Handle drag start for files
  const handleFileDragStart = (file: DriveFile, e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
    onFileDragStart?.(file, e);
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
          <span>Loading...</span>
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

    const items = [...folder.folders, ...folder.files];

    if (items.length === 0) {
      return (
        <div
          className="py-2 text-muted-foreground text-sm italic"
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
        >
          Empty folder
        </div>
      );
    }

    return (
      <div>
        {folder.folders.map((childFolder: DriveFolder) => (
          <FolderTreeItem
            key={childFolder.id}
            item={childFolder}
            depth={depth}
            isFolder
            expanded={state[childFolder.id]?.expanded}
            loading={state[childFolder.id]?.loading}
            hasChildren={true}
            onToggle={() => toggleFolder(childFolder.id)}
            onReload={() => reloadFolder(childFolder.id)}
            onHover={() => prefetchFolder(childFolder.id)}
          >
            {renderFolderContents(childFolder.id, depth + 1)}
          </FolderTreeItem>
        ))}
        {folder.files.map((file: DriveFile) => (
          <FolderTreeItem
            key={file.id}
            item={file}
            depth={depth}
            isFolder={false}
            onDragStart={(e) => handleFileDragStart(file, e)}
            onClick={() => onFileSelect?.(file)}
            canDelete={canDelete}
            onDelete={canDelete ? async () => { await deleteFile(file.id, folderId); } : undefined}
          />
        ))}
      </div>
    );
  };

  if (!rootFolderId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Folder className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground">
          No root folder configured
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Configure a root folder in Program settings
        </p>
      </div>
    );
  }

  if (rootLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rootError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive">{rootError}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {/* Root folder */}
        <FolderTreeItem
          item={{
            id: rootFolderId,
            name: rootFolderName || "Root",
            mimeType: "application/vnd.google-apps.folder",
          }}
          depth={0}
          isFolder
          expanded={state[rootFolderId]?.expanded ?? true}
          loading={state[rootFolderId]?.loading}
          hasChildren={true}
          onToggle={() => toggleFolder(rootFolderId)}
          onReload={() => reloadFolder(rootFolderId)}
        >
          {renderFolderContents(rootFolderId, 1)}
        </FolderTreeItem>
      </div>
    </ScrollArea>
  );
}
