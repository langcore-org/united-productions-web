"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User, Bot, File, Loader2 } from "lucide-react";
import type { FileReference } from "./ChatInput";
import type { SessionStatus } from "@/lib/agent/types";

export interface MessageUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  file_attachments?: FileReference[];
  created_at: string;
  user_id?: string | null;
  user?: MessageUser | null;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  sessionStatus?: SessionStatus;
}

export function MessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  streamingContent = "",
  sessionStatus = "idle",
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages or streaming content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center">
        <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium mb-2">会話を始める</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          質問したり、タスクのサポートを受けたり、アイデアを話し合ったりできます。
          @ でチームファイルを参照するか、フォルダツリーからファイルをドラッグしてください。
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0 p-4">
      <div className="flex flex-col justify-end min-h-full">
        <div className="space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "flex-row-reverse" : ""
            )}
          >
            {/* Avatar */}
            <Avatar className="h-8 w-8 shrink-0">
              {message.role === "user" ? (
                <AvatarImage
                  src={message.user?.avatar_url || ""}
                  alt={message.user?.display_name || "User"}
                />
              ) : null}
              <AvatarFallback
                className={cn(
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.role === "user" ? (
                  message.user?.display_name ? (
                    <span className="text-xs font-medium">
                      {message.user.display_name.slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <User className="h-4 w-4" />
                  )
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>

            {/* Message content */}
            <div
              className={cn(
                "flex-1 space-y-2 max-w-[80%]",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              {/* User name for user messages */}
              {message.role === "user" && message.user?.display_name && (
                <p className={cn(
                  "text-xs font-medium text-muted-foreground px-1",
                  message.role === "user" ? "text-right" : "text-left"
                )}>
                  {message.user.display_name}
                </p>
              )}

              {/* Message bubble with inline files */}
              <div
                className={cn(
                  "rounded-lg px-4 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="whitespace-pre-wrap break-words">
                  {/* Render files inline at the beginning */}
                  {message.file_attachments && message.file_attachments.length > 0 && (
                    <>
                      {message.file_attachments.map((file) => (
                        <a
                          key={file.id}
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs mr-1 align-middle",
                            message.role === "user"
                              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                              : "bg-background hover:bg-background/80"
                          )}
                        >
                          <File className="h-3 w-3" />
                          <span className="max-w-[120px] truncate">{file.name}</span>
                        </a>
                      ))}
                    </>
                  )}
                  {message.content}
                </div>
              </div>

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground px-1">
                {new Date(message.created_at).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && !isStreaming && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-muted">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Streaming message */}
        {isStreaming && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-muted">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2 max-w-[80%]">
              {/* Streaming content */}
              {streamingContent && (
                <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                  <div className="whitespace-pre-wrap break-words">
                    {streamingContent}
                    <span className="inline-block w-2 h-4 bg-foreground/70 ml-0.5 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
        </div>
      </div>
    </ScrollArea>
  );
}
