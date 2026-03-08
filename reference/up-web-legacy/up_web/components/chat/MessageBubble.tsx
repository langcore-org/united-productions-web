"use client";

import { cn } from "@/lib/utils";
import { User, Bot, Copy, Check, FileText, ExternalLink } from "lucide-react";
import { useState, useCallback } from "react";
import { MarkdownPreview } from "./MarkdownPreview";
import type { FileReference } from "@/lib/agent/types";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  attachedFiles?: FileReference[];
  isStreaming?: boolean;
  className?: string;
}

export function MessageBubble({
  role,
  content,
  attachedFiles,
  isStreaming,
  className,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [content]);

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 w-full",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div
        className={cn(
          "relative max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        {/* Attached files */}
        {attachedFiles && attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                  isUser
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background"
                )}
              >
                <FileText className="w-3 h-3" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : (
          <MarkdownPreview content={content} />
        )}

        {/* Streaming cursor */}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
        )}

        {/* Copy button for assistant messages */}
        {isAssistant && content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="absolute -right-2 -bottom-2 p-1.5 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            title="コピー"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}
