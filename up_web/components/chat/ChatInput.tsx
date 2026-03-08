"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  X,
  File,
  Folder,
  Loader2,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/lib/google-drive/types";

// File reference attached to message
export interface FileReference {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  source: "mention" | "dragdrop" | "auto-detect";
}

// Team file reference from team_file_refs
export interface TeamFileRef {
  id: string;
  ref_type: "file" | "folder";
  drive_id: string;
  drive_name: string;
  drive_path: string | null;
  mime_type: string | null;
  include_subfolders: boolean;
}

interface ChatInputProps {
  teamFiles: TeamFileRef[];
  onSend: (message: string, files: FileReference[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  workspaceId: string;
}


export function ChatInput({
  teamFiles,
  onSend,
  isLoading = false,
  disabled = false,
  workspaceId,
}: ChatInputProps) {
  // File references state (object-based management)
  const [fileReferences, setFileReferences] = useState<Map<string, FileReference>>(new Map());
  const [messageText, setMessageText] = useState("");

  const [isDragOver, setIsDragOver] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mentionRangeRef = useRef<Range | null>(null);

  // Get all attached files from state
  const attachedFiles = useMemo(() => {
    return Array.from(fileReferences.values());
  }, [fileReferences]);

  // Calculate indent level from path
  const getIndentLevel = (path: string | null): number => {
    if (!path) return 0;
    const parts = path.split("/").filter(Boolean);
    return Math.min(parts.length, 4);
  };

  // Sort files by path for folder structure display
  const sortedTeamFiles = useMemo(() => {
    return [...teamFiles].sort((a, b) => {
      const fullPathA = a.drive_path ? `${a.drive_path}/${a.drive_name}` : a.drive_name;
      const fullPathB = b.drive_path ? `${b.drive_path}/${b.drive_name}` : b.drive_name;
      const pathA = a.drive_path || "";
      const pathB = b.drive_path || "";

      if (pathA === pathB) {
        if (a.ref_type === "folder" && b.ref_type !== "folder") return -1;
        if (a.ref_type !== "folder" && b.ref_type === "folder") return 1;
        return a.drive_name.localeCompare(b.drive_name);
      }
      return fullPathA.localeCompare(fullPathB);
    });
  }, [teamFiles]);

  // Filter team files based on filter query
  const filteredTeamFiles = useMemo(() => {
    if (!filterQuery.trim()) return sortedTeamFiles;
    const query = filterQuery.toLowerCase();
    return sortedTeamFiles.filter(
      (file) =>
        file.drive_name.toLowerCase().includes(query) ||
        (file.drive_path && file.drive_path.toLowerCase().includes(query))
    );
  }, [sortedTeamFiles, filterQuery]);

  // Scroll selected item into view
  useEffect(() => {
    if (showMentionPicker && listRef.current) {
      const selectedItem = listRef.current.querySelector(`button:nth-child(${selectedIndex + 1})`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex, showMentionPicker]);

  // Get plain text content from editor (excluding file chip references)
  const getPlainText = useCallback(() => {
    if (!editorRef.current) return "";

    let text = "";
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.refId) {
          // This is a file chip - skip adding to text (files are handled separately)
        } else if (el.tagName === "BR") {
          text += "\n";
        } else {
          el.childNodes.forEach(walk);
        }
      }
    };
    editorRef.current.childNodes.forEach(walk);
    return text;
  }, []);

  // Get text content WITH file placeholders for prompt enhancement
  // Returns text like: "{{FILE:id:name}} を元に {{FILE:id2:name2}} を参照して"
  const getTextWithFilePlaceholders = useCallback(() => {
    if (!editorRef.current) return "";

    let text = "";
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.refId) {
          // This is a file chip - add placeholder with ID and name
          const refId = el.dataset.refId;
          const displayName = el.dataset.displayName || "file";
          text += `{{FILE:${refId}:${displayName}}}`;
        } else if (el.tagName === "BR") {
          text += "\n";
        } else {
          el.childNodes.forEach(walk);
        }
      }
    };
    editorRef.current.childNodes.forEach(walk);
    return text;
  }, []);

  // Create file chip element
  const createChipElement = useCallback((ref: FileReference): HTMLSpanElement => {
    const chip = document.createElement("span");
    chip.contentEditable = "false";
    chip.dataset.refId = ref.id;
    chip.dataset.displayName = ref.name;
    chip.className =
      "inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-primary/10 text-primary rounded text-sm select-none";

    const icon = document.createElement("span");
    icon.className = "flex-shrink-0";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;

    const name = document.createElement("span");
    name.className = "truncate max-w-[150px]";
    name.textContent = ref.name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ml-0.5 hover:text-destructive flex-shrink-0";
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    removeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      chip.remove();
      setFileReferences((prev) => {
        const next = new Map(prev);
        next.delete(ref.id);
        return next;
      });
      // Update text after removing chip
      setMessageText(getPlainText());
      editorRef.current?.focus();
    };

    chip.appendChild(icon);
    chip.appendChild(name);
    chip.appendChild(removeBtn);

    return chip;
  }, [getPlainText]);

  // Handle input changes in contenteditable
  const handleInput = useCallback(() => {
    const text = getPlainText();
    setMessageText(text);

    // Check for @ trigger
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE) {
      const textContent = textNode.textContent || "";
      const cursorPos = range.startOffset;

      // Look backwards for @
      let atPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        const char = textContent[i];
        if (char === "@") {
          // Check if @ is at start or preceded by space/newline
          if (i === 0 || textContent[i - 1] === " " || textContent[i - 1] === "\n") {
            atPos = i;
            break;
          }
        }
        if (char === " " || char === "\n") break;
      }

      if (atPos >= 0) {
        const query = textContent.slice(atPos + 1, cursorPos);
        // Only show picker if query doesn't contain space
        if (!query.includes(" ") && !query.includes("\n")) {
          setShowMentionPicker(true);
          setFilterQuery(query);
          setSelectedIndex(0);
          // Save range for later replacement
          const newRange = document.createRange();
          newRange.setStart(textNode, atPos);
          newRange.setEnd(textNode, cursorPos);
          mentionRangeRef.current = newRange;
          return;
        }
      }
    }

    // Close picker if no @ context
    if (showMentionPicker) {
      setShowMentionPicker(false);
      setFilterQuery("");
      mentionRangeRef.current = null;
    }
  }, [getPlainText, showMentionPicker]);

  // Handle mention selection - insert file chip at cursor position
  const handleMentionSelect = useCallback((file: TeamFileRef) => {
    // Check if file already attached
    if (fileReferences.has(file.drive_id)) {
      setShowMentionPicker(false);
      setFilterQuery("");
      mentionRangeRef.current = null;
      return;
    }

    // Create file reference
    const ref: FileReference = {
      id: file.drive_id,
      name: file.drive_name,
      mimeType: file.mime_type || "application/octet-stream",
      source: "mention",
    };

    // Update references state
    setFileReferences((prev) => {
      const next = new Map(prev);
      next.set(ref.id, ref);
      return next;
    });

    // Insert chip into editor
    if (mentionRangeRef.current && editorRef.current) {
      const chip = createChipElement(ref);

      // Delete the @query text
      mentionRangeRef.current.deleteContents();

      // Insert chip
      mentionRangeRef.current.insertNode(chip);

      // Add space after chip and move cursor
      const space = document.createTextNode(" ");
      chip.after(space);

      // Move cursor after space
      const selection = window.getSelection();
      if (selection) {
        const newRange = document.createRange();
        newRange.setStartAfter(space);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      // Update text state
      setMessageText(getPlainText());
    }

    setShowMentionPicker(false);
    setFilterQuery("");
    mentionRangeRef.current = null;
  }, [fileReferences, createChipElement, getPlainText]);

  // Handle send (defined before handleKeyDown since it's used there)
  const handleSend = useCallback(() => {
    const text = getPlainText().trim();
    if (!text && attachedFiles.length === 0) return;
    if (isLoading || disabled) return;

    onSend(text, attachedFiles);

    // Clear editor and references
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setFileReferences(new Map());
    setMessageText("");
  }, [getPlainText, attachedFiles, isLoading, disabled, onSend]);

  // Handle keyboard events in editor
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentionPicker) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredTeamFiles.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredTeamFiles[selectedIndex]) {
          handleMentionSelect(filteredTeamFiles[selectedIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionPicker(false);
        setFilterQuery("");
        mentionRangeRef.current = null;
        return;
      }
    }

    // Ctrl/Cmd + Enter to send
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
  }, [showMentionPicker, filteredTeamFiles, selectedIndex, handleMentionSelect, handleSend]);

  // Handle key events in filter input
  const handleFilterKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setShowMentionPicker(false);
      setFilterQuery("");
      setSelectedIndex(0);
      editorRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredTeamFiles.length - 1 ? prev + 1 : prev
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      return;
    }
    if (e.key === "Enter" && filteredTeamFiles.length > 0) {
      e.preventDefault();
      handleMentionSelect(filteredTeamFiles[selectedIndex]);
      return;
    }
  }, [filteredTeamFiles, selectedIndex, handleMentionSelect]);

  // Handle paste - strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // Handle prompt enhancement
  const handleEnhance = useCallback(async () => {
    // Get text WITH file placeholders to preserve positions
    const textWithPlaceholders = getTextWithFilePlaceholders().trim();
    if (!textWithPlaceholders || isEnhancing || isLoading || disabled) return;

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/chat/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textWithPlaceholders,
          files: attachedFiles.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
          })),
          workspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Enhancement failed");
      }

      const { enhancedPrompt } = await response.json();

      // Reconstruct editor content with file chips in their new positions
      if (editorRef.current) {
        editorRef.current.innerHTML = "";

        // Parse the enhanced prompt and reconstruct with chips
        // Pattern: {{FILE:id:name}}
        const filePlaceholderRegex = /\{\{FILE:([^:]+):([^}]+)\}\}/g;
        let lastIndex = 0;
        let match;

        while ((match = filePlaceholderRegex.exec(enhancedPrompt)) !== null) {
          // Add text before the placeholder
          if (match.index > lastIndex) {
            const textBefore = enhancedPrompt.slice(lastIndex, match.index);
            editorRef.current.appendChild(document.createTextNode(textBefore));
          }

          // Find the file reference and create chip
          const fileId = match[1];
          const fileName = match[2];
          const fileRef = fileReferences.get(fileId);

          if (fileRef) {
            const chip = createChipElement(fileRef);
            editorRef.current.appendChild(chip);
          } else {
            // Fallback: create chip from placeholder data
            const fallbackRef: FileReference = {
              id: fileId,
              name: fileName,
              mimeType: "application/octet-stream",
              source: "mention",
            };
            const chip = createChipElement(fallbackRef);
            editorRef.current.appendChild(chip);
          }

          lastIndex = match.index + match[0].length;
        }

        // Add remaining text after last placeholder
        if (lastIndex < enhancedPrompt.length) {
          const textAfter = enhancedPrompt.slice(lastIndex);
          editorRef.current.appendChild(document.createTextNode(textAfter));
        }

        setMessageText(getPlainText());
      }
    } catch (error) {
      console.error("Prompt enhancement error:", error);
    } finally {
      setIsEnhancing(false);
    }
  }, [getTextWithFilePlaceholders, getPlainText, attachedFiles, fileReferences, createChipElement, isEnhancing, isLoading, disabled, workspaceId]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const jsonData = e.dataTransfer.getData("application/json");
    if (jsonData) {
      try {
        const file: DriveFile = JSON.parse(jsonData);
        if (!fileReferences.has(file.id)) {
          // Create file reference
          const ref: FileReference = {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            webViewLink: file.webViewLink,
            source: "dragdrop",
          };

          // Update state
          setFileReferences((prev) => {
            const next = new Map(prev);
            next.set(ref.id, ref);
            return next;
          });

          // Insert chip at end of editor
          if (editorRef.current) {
            const chip = createChipElement(ref);
            editorRef.current.appendChild(document.createTextNode(" "));
            editorRef.current.appendChild(chip);
            editorRef.current.appendChild(document.createTextNode(" "));

            // Move cursor to end
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(editorRef.current);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }

            setMessageText(getPlainText());
          }
        }
      } catch {
        // Invalid JSON data
      }
    }
  }, [fileReferences, createChipElement, getPlainText]);

  // Reset filter index when filter changes
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterQuery(e.target.value);
    setSelectedIndex(0);
  }, []);

  // Focus editor and show picker when filter input is shown
  useEffect(() => {
    if (showMentionPicker) {
      setTimeout(() => filterInputRef.current?.focus(), 50);
    }
  }, [showMentionPicker]);

  // Sync editor state when disabled changes
  useEffect(() => {
    if (editorRef.current) {
      if (disabled || isLoading) {
        editorRef.current.contentEditable = "false";
      } else {
        editorRef.current.contentEditable = "true";
      }
    }
  }, [disabled, isLoading]);

  return (
    <div className="relative">
      {/* Mention Picker Dropdown */}
      {showMentionPicker && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Header with filter */}
          <div className="p-2 border-b bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Team Reference Files ({filteredTeamFiles.length}/{teamFiles.length})
              </p>
              <button
                onClick={() => {
                  setShowMentionPicker(false);
                  setFilterQuery("");
                  editorRef.current?.focus();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Filter input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={filterInputRef}
                type="text"
                placeholder="ファイル名で検索..."
                value={filterQuery}
                onChange={handleFilterChange}
                onKeyDown={handleFilterKeyDown}
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>
          {/* File list with scroll */}
          <div ref={listRef} className="h-56 overflow-y-auto py-1">
            {filteredTeamFiles.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                マッチするファイルがありません
              </div>
            ) : (
              filteredTeamFiles.map((file, index) => {
                const indent = getIndentLevel(file.drive_path);
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={file.id}
                    onClick={() => handleMentionSelect(file)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-2 py-1.5 transition-colors text-left",
                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                    style={{ paddingLeft: `${12 + indent * 16}px`, paddingRight: "12px" }}
                  >
                    {file.ref_type === "folder" ? (
                      <Folder className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.drive_name}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {/* Hint */}
          <div className="px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
            ↑↓ 移動 • Enter 選択 • Esc 閉じる
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div
        className={cn(
          "border rounded-lg transition-colors",
          isDragOver && "border-primary bg-primary/5",
          disabled && "opacity-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop Zone Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10">
            <div className="text-center">
              <File className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium text-primary">
                Drop file to attach
              </p>
            </div>
          </div>
        )}

        {/* Input Row - Contenteditable with inline chips */}
        <div className="flex items-start gap-2 p-2">
          <div
            ref={editorRef}
            contentEditable={!isLoading && !disabled}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            data-placeholder="@ でファイル参照"
            className={cn(
              "flex-1 min-h-[40px] max-h-[200px] overflow-y-auto px-2 py-1 text-sm outline-none",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
              (isLoading || disabled) && "cursor-not-allowed opacity-50"
            )}
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          />

          {/* Enhance Button */}
          <Button
            onClick={handleEnhance}
            disabled={!messageText || isEnhancing || isLoading || disabled}
            variant="ghost"
            size="icon"
            className="shrink-0 mt-1"
            title="プロンプトを強化"
          >
            {isEnhancing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={(!messageText && attachedFiles.length === 0) || isLoading || disabled}
            size="icon"
            className="shrink-0 mt-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Hint */}
        <div className="px-3 pb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="hidden sm:inline">⌘/Ctrl+Enter で送信</span>
          <span>@ でファイル参照</span>
          <span className="hidden md:inline">ファイルをドラッグ&ドロップ</span>
          {attachedFiles.length > 0 && (
            <span className="hidden sm:inline">Backspace/Delete で添付解除</span>
          )}
        </div>
      </div>
    </div>
  );
}
