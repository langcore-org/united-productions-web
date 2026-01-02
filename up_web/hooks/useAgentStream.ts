"use client";

import { useState, useCallback, useRef } from "react";
import type { Todo, GeneratedFile, SessionStatus, FileUploadStatus } from "@/lib/agent/types";

export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onContent?: (content: string, accumulated: string) => void;
  onTodoUpdate?: (todos: Todo[]) => void;
  onFileCreated?: (path: string) => void;
  onGdriveFileCreated?: (file: GeneratedFile) => void;
  onError?: (error: string) => void;
  onComplete?: (finalContent: string) => void;
}

export interface UseAgentStreamReturn {
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (messages: AgentMessage[], callbacks?: StreamCallbacks) => Promise<string>;
  stop: () => void;
}

/**
 * Custom hook for streaming chat with Agent API.
 * Sends messages in OpenAI format and parses SSE responses.
 */
export function useAgentStream(): UseAgentStreamReturn {
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (messages: AgentMessage[], callbacks?: StreamCallbacks): Promise<string> => {
      // Reset state
      setStreamingContent("");
      setError(null);
      setIsStreaming(true);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      let accumulated = "";

      try {
        const response = await fetch("/api/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            stream: true,
            enable_tools: true,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Parse Vercel AI SDK Data Stream format
            // Format: "0:\"content\"" for text, "2:[{...}]" for data
            const colonIndex = trimmed.indexOf(":");
            if (colonIndex === -1) continue;

            const prefix = trimmed.slice(0, colonIndex);
            const data = trimmed.slice(colonIndex + 1);

            try {
              if (prefix === "0") {
                // Text content chunk
                const content = JSON.parse(data) as string;
                accumulated += content;
                setStreamingContent(accumulated);
                callbacks?.onContent?.(content, accumulated);
              } else if (prefix === "2") {
                // Data chunk (todos, files, etc.)
                const items = JSON.parse(data) as Array<Record<string, unknown>>;
                for (const item of items) {
                  if (item.type === "todo_update" && Array.isArray(item.todos)) {
                    const todos = (item.todos as Array<{
                      content: string;
                      status: string;
                      activeForm?: string;
                      id?: string;
                    }>).map((t, i) => ({
                      id: t.id || `todo-${i}-${Date.now()}`,
                      content: t.content,
                      status: t.status as Todo["status"],
                      activeForm: t.activeForm,
                    }));
                    callbacks?.onTodoUpdate?.(todos);
                  } else if (item.type === "file_created" && typeof item.path === "string") {
                    callbacks?.onFileCreated?.(item.path);
                  } else if (item.type === "gdrive_file_created" && typeof item.file_name === "string") {
                    if (item.status === "completed" && item.drive_id) {
                      const file: GeneratedFile = {
                        id: `gdrive-${item.drive_id}`,
                        path: `gdrive://${item.folder_id || "drive"}/${item.file_name}`,
                        name: item.file_name as string,
                        createdAt: new Date().toISOString(),
                        uploadStatus: "completed" as FileUploadStatus,
                        driveId: item.drive_id as string,
                        driveUrl: item.web_view_link as string | undefined,
                      };
                      callbacks?.onGdriveFileCreated?.(file);
                    }
                  } else if (item.type === "error" && typeof item.message === "string") {
                    callbacks?.onError?.(item.message);
                    setError(item.message);
                  }
                }
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex !== -1) {
            const prefix = trimmed.slice(0, colonIndex);
            const data = trimmed.slice(colonIndex + 1);
            try {
              if (prefix === "0") {
                const content = JSON.parse(data) as string;
                accumulated += content;
                setStreamingContent(accumulated);
              }
            } catch {
              // Ignore
            }
          }
        }

        callbacks?.onComplete?.(accumulated);
        return accumulated;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped the stream
          callbacks?.onComplete?.(accumulated);
          return accumulated;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        callbacks?.onError?.(message);
        throw err;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  return {
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    stop,
  };
}
