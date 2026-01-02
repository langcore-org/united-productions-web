"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  FileText,
  FileImage,
  File,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface PreviewFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  modifiedTime?: string;
  previewable: boolean;
  previewType: "image" | "pdf" | "text" | "office" | "unsupported";
}

interface FilePreviewProps {
  file: PreviewFile | null;
  workspaceId: string;
  onClose: () => void;
}

export function FilePreview({ file, workspaceId, onClose }: FilePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // Cleanup blob URL on unmount or file change
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Load file content
  const loadFile = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setContent(null);
    setZoom(100);

    // Cleanup previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    try {
      // First, get metadata
      const metaRes = await fetch(
        `/api/workspace/drive/files/${file.id}/metadata?workspaceId=${workspaceId}`
      );

      if (!metaRes.ok) {
        const errorData = await metaRes.json();
        throw new Error(errorData.error || "Failed to load file metadata");
      }

      const meta: FileMetadata = await metaRes.json();
      setMetadata(meta);

      if (!meta.previewable) {
        setLoading(false);
        return;
      }

      // Load content based on preview type
      if (meta.previewType === "text") {
        const contentRes = await fetch(
          `/api/workspace/drive/files/${file.id}?workspaceId=${workspaceId}`
        );

        if (!contentRes.ok) {
          throw new Error("Failed to load file content");
        }

        const text = await contentRes.text();
        setContent(text);
      } else if (meta.previewType === "image" || meta.previewType === "pdf") {
        const contentRes = await fetch(
          `/api/workspace/drive/files/${file.id}?workspaceId=${workspaceId}`
        );

        if (!contentRes.ok) {
          throw new Error("Failed to load file content");
        }

        const blob = await contentRes.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      }
      // For office files, we use Google Drive Viewer directly (no blob needed)
    } catch (err) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [file, workspaceId, blobUrl]);

  // Load file when selected
  useEffect(() => {
    loadFile();
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!file) {
    return null;
  }

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon
  const getFileIcon = () => {
    if (!metadata) return File;
    if (metadata.previewType === "image") return FileImage;
    if (metadata.previewType === "pdf" || metadata.previewType === "text") return FileText;
    return File;
  };

  const FileIcon = getFileIcon();

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{file.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {metadata?.webViewLink && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open(metadata.webViewLink, "_blank")}
              title="Open in Google Drive"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Close preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar for zoomable content (not for office - Google Drive Viewer has its own controls) */}
      {metadata?.previewable && (metadata.previewType === "image" || metadata.previewType === "pdf") && !loading && !error && blobUrl && (
        <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 border-b bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.max(25, z - 25))}
            disabled={zoom <= 25}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-16 text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.min(200, z + 25))}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={loadFile}
            title="Reload"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={loadFile}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && metadata && !metadata.previewable && (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <File className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Preview not available for this file type
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {metadata.mimeType}
            </p>
            {metadata.webViewLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(metadata.webViewLink, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Drive
              </Button>
            )}
          </div>
        )}

        {/* Image preview */}
        {!loading && !error && metadata?.previewType === "image" && blobUrl && (
          <div className="h-full overflow-auto p-4">
            <div
              className="flex items-center justify-center min-h-full"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blobUrl}
                alt={file.name}
                className="max-w-full h-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* PDF preview */}
        {!loading && !error && metadata?.previewType === "pdf" && blobUrl && (
          <div className="h-full w-full">
            <iframe
              src={`${blobUrl}#zoom=${zoom}`}
              className="w-full h-full border-0"
              title={file.name}
            />
          </div>
        )}

        {/* Text preview */}
        {!loading && !error && metadata?.previewType === "text" && content !== null && (
          <ScrollArea className="h-full">
            <pre className={cn(
              "p-4 text-sm font-mono whitespace-pre-wrap break-words",
              "bg-muted/30"
            )}>
              {content}
            </pre>
          </ScrollArea>
        )}

        {/* Office documents - use Google Drive Viewer */}
        {!loading && !error && metadata?.previewType === "office" && (
          <div className="h-full w-full flex flex-col">
            <iframe
              src={`https://drive.google.com/file/d/${file.id}/preview`}
              className="w-full flex-1 border-0"
              title={file.name}
              allow="autoplay"
              sandbox="allow-scripts allow-same-origin"
              onError={() => setError("Failed to load preview")}
            />
            {/* Fallback link if iframe doesn't work */}
            <div className="shrink-0 p-2 text-center border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Preview not loading?{" "}
                <a
                  href={metadata.webViewLink || `https://drive.google.com/file/d/${file.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open in Google Drive
                </a>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      {metadata && !loading && (
        <div className="shrink-0 px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-4">
            <span className="truncate">{metadata.mimeType}</span>
            {metadata.size && <span>{formatSize(metadata.size)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
