"use client";

import { useMemo, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FileText,
  Users,
  FileImage,
  FileType,
  File,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamFileRef } from "@/components/chat";

interface TeamFileTreeProps {
  teamFiles: TeamFileRef[];
  onFileSelect?: (file: TeamFileRef) => void;
  onFileDragStart?: (file: TeamFileRef, e: React.DragEvent) => void;
  onReload?: () => Promise<void>;
  isReloading?: boolean;
}

// Tree node structure
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: TeamFileRef;
  children: Map<string, TreeNode>;
}

// Get file icon based on mime type or file name
function getFileIcon(mimeType: string | null, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    return <FileType className="h-4 w-4 text-red-500 flex-shrink-0" />;
  }

  // Images
  if (
    mimeType?.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)
  ) {
    return <FileImage className="h-4 w-4 text-green-500 flex-shrink-0" />;
  }

  // Text/Markdown/Documents
  if (
    mimeType?.startsWith("text/") ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.google-apps.document" ||
    ["md", "txt", "doc", "docx", "rtf"].includes(ext)
  ) {
    return <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  }

  // Default
  return <File className="h-4 w-4 text-gray-500 flex-shrink-0" />;
}

// Build tree structure from flat file list
function buildTree(files: TeamFileRef[]): TreeNode {
  const root: TreeNode = {
    name: "root",
    path: "",
    isFolder: true,
    children: new Map(),
  };

  for (const file of files) {
    const pathParts = file.drive_path ? file.drive_path.split("/").filter(Boolean) : [];
    let currentNode = root;

    // Create folder nodes for each path segment
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const fullPath = pathParts.slice(0, i + 1).join("/");

      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, {
          name: part,
          path: fullPath,
          isFolder: true,
          children: new Map(),
        });
      }
      currentNode = currentNode.children.get(part)!;
    }

    // Add the file/folder itself
    if (file.ref_type === "folder") {
      // This is a configured folder reference - might already exist from path traversal
      if (!currentNode.children.has(file.drive_name)) {
        currentNode.children.set(file.drive_name, {
          name: file.drive_name,
          path: file.drive_path ? `${file.drive_path}/${file.drive_name}` : file.drive_name,
          isFolder: true,
          file,
          children: new Map(),
        });
      } else {
        // Update existing folder node with file reference
        const existingNode = currentNode.children.get(file.drive_name)!;
        existingNode.file = file;
      }
    } else {
      // Regular file
      currentNode.children.set(file.drive_name, {
        name: file.drive_name,
        path: file.drive_path ? `${file.drive_path}/${file.drive_name}` : file.drive_name,
        isFolder: false,
        file,
        children: new Map(),
      });
    }
  }

  return root;
}

// Recursive tree node component
function TreeNodeComponent({
  node,
  depth,
  expandedPaths,
  onToggle,
  onFileSelect,
  onFileDragStart,
  onReload,
  isReloading,
}: {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileSelect?: (file: TeamFileRef) => void;
  onFileDragStart?: (file: TeamFileRef, e: React.DragEvent) => void;
  onReload?: () => Promise<void>;
  isReloading?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.children.size > 0;

  // Sort children: folders first, then files, alphabetically
  const sortedChildren = useMemo(() => {
    const children = Array.from(node.children.values());
    return children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [node.children]);

  const handleClick = () => {
    if (node.isFolder) {
      onToggle(node.path);
    } else if (node.file) {
      onFileSelect?.(node.file);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!node.isFolder && node.file) {
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          id: node.file.drive_id,
          name: node.file.drive_name,
          mimeType: node.file.mime_type || "application/octet-stream",
        })
      );
      e.dataTransfer.effectAllowed = "copy";
      onFileDragStart?.(node.file, e);
    }
  };

  // Count files in folder (recursively)
  const fileCount = useMemo(() => {
    if (!node.isFolder) return 0;
    let count = 0;
    const countFiles = (n: TreeNode) => {
      for (const child of n.children.values()) {
        if (child.isFolder) {
          countFiles(child);
        } else {
          count++;
        }
      }
    };
    countFiles(node);
    return count;
  }, [node]);

  const handleReloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReload?.();
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 cursor-pointer transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          !node.isFolder && "cursor-grab active:cursor-grabbing"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        draggable={!node.isFolder}
        onDragStart={handleDragStart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/collapse chevron for folders */}
        {node.isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
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
        {node.isFolder ? (
          <Folder className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        ) : (
          getFileIcon(node.file?.mime_type || null, node.name)
        )}

        {/* Name */}
        <span className="text-sm truncate flex-1">{node.name}</span>

        {/* Reload button for root-level folders (on hover) */}
        {node.isFolder && depth === 0 && isHovered && onReload && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 opacity-70 hover:opacity-100"
            onClick={handleReloadClick}
            disabled={isReloading}
            title="再読み込み"
          >
            {isReloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* File count for folders */}
        {node.isFolder && fileCount > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {fileCount}
          </span>
        )}
      </div>

      {/* Children (when expanded) */}
      {node.isFolder && isExpanded && (
        <div>
          {sortedChildren.map((child) => (
            <TreeNodeComponent
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onFileSelect={onFileSelect}
              onFileDragStart={onFileDragStart}
              onReload={onReload}
              isReloading={isReloading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamFileTree({
  teamFiles,
  onFileSelect,
  onFileDragStart,
  onReload,
  isReloading,
}: TeamFileTreeProps) {
  // Track expanded folders
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    // Start with root level expanded
    return new Set([""]);
  });

  // Build tree structure from flat file list
  const tree = useMemo(() => buildTree(teamFiles), [teamFiles]);

  // Toggle folder expansion
  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (teamFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground">
          チームファイルが設定されていません
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          チーム設定でファイルを追加してください
        </p>
      </div>
    );
  }

  // Get root level children
  const rootChildren = Array.from(tree.children.values()).sort((a, b) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {rootChildren.map((child) => (
          <TreeNodeComponent
            key={child.path || child.name}
            node={child}
            depth={0}
            expandedPaths={expandedPaths}
            onToggle={handleToggle}
            onFileSelect={onFileSelect}
            onFileDragStart={onFileDragStart}
            onReload={onReload}
            isReloading={isReloading}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
