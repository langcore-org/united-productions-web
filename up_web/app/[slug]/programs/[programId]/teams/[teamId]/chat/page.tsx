"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { createClient } from "@/lib/supabase/client";
import { SidebarTabs, FolderTree, TeamFileTree } from "@/components/sidebar";
import {
  SessionList,
  type SessionListRef,
  ChatInput,
  MessageList,
  FilePreview,
  TaskPanel,
  type FileReference,
  type TeamFileRef,
  type Message,
  type PreviewFile,
} from "@/components/chat";
import { ModeSelector } from "@/components/modes/ModeSelector";
import type { Todo, GeneratedFile, SessionStatus, FileUploadStatus } from "@/lib/agent/types";
import { AgentMode, getDefaultMode, getModeById, AGENT_MODES, generateSystemPrompt, type DriveFileRef } from "@/lib/modes";
import type { DriveFile } from "@/lib/google-drive/types";
import { Button } from "@/components/ui/button";
import { Loader2, Menu, X, ArrowLeft, StopCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { detectFileMentions, mergeFileReferences } from "@/lib/file-detection";
import {
  saveTodos,
  saveGeneratedFile,
  updateGeneratedFile,
  loadSessionData,
} from "@/lib/session-persistence";

interface TeamData {
  id: string;
  name: string;
  output_directory_id: string | null;
  output_directory_name: string | null;
  program: {
    id: string;
    name: string;
    workspace_id: string;
    google_drive_root_id: string | null;
    google_drive_root_name: string | null;
  };
}

// New Chat Selector Component - displayed when no session is selected
function NewChatSelector({ onSelectMode }: { onSelectMode: (mode: AgentMode) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Start a conversation</h2>
          <p className="text-muted-foreground">
            Ask questions, get help with tasks, or discuss ideas. Use @ to
            reference team files or drag files from the folder tree.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AGENT_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode)}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all group",
                "border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{mode.icon}</span>
                <div className="min-w-0">
                  <div className="font-medium group-hover:text-primary transition-colors truncate">
                    {mode.name}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {mode.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TeamChatPage({
  params,
}: {
  params: Promise<{ slug: string; programId: string; teamId: string }>;
}) {
  const { slug, programId, teamId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Data state
  const [team, setTeam] = useState<TeamData | null>(null);
  const [teamFiles, setTeamFiles] = useState<TeamFileRef[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canDeleteFiles, setCanDeleteFiles] = useState(false);
  const [isReloadingTeamFiles, setIsReloadingTeamFiles] = useState(false);

  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [dbMessages, setDbMessages] = useState<Message[]>([]);
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null);

  // Streaming state - simplified
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Refs
  const sessionListRef = useRef<SessionListRef>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Streaming content state
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Extract text content from UIMessage parts
  const extractTextFromParts = useCallback((message: UIMessage): string => {
    if (!message.parts) return "";
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  }, []);

  // Create transport with dynamic body
  const transportRef = useRef<DefaultChatTransport<UIMessage> | null>(null);

  // Update transport when claudeSessionId changes
  useEffect(() => {
    transportRef.current = new DefaultChatTransport({
      api: "/api/chat/completions",
      body: {
        session_id: claudeSessionId,
        enable_tools: true,
      },
    });
  }, [claudeSessionId]);

  // useChat from Vercel AI SDK v6 - primary streaming mechanism
  const {
    messages: chatMessages,
    sendMessage,
    stop,
    status,
    setMessages: setChatMessages,
    error: chatError,
  } = useChat({
    transport: transportRef.current || new DefaultChatTransport({
      api: "/api/chat/completions",
      body: {
        session_id: claudeSessionId,
        enable_tools: true,
      },
    }),
    onFinish: async ({ message }) => {
      // Save assistant message to Supabase when streaming completes
      const content = extractTextFromParts(message);
      if (currentSessionIdRef.current && content) {
        const supabase = createClient();
        const { data: savedMessage } = await supabase
          .from("messages")
          .insert({
            session_id: currentSessionIdRef.current,
            role: "assistant",
            content: content,
          })
          .select("id, role, content, file_attachments, created_at")
          .single();

        if (savedMessage) {
          setDbMessages((prev) => [...prev, savedMessage as Message]);
        }
      }
      setSessionStatus("completed");
      setIsLoading(false);
      setStreamingContent("");
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setSessionStatus("error");
      setIsLoading(false);
    },
    onData: (dataItem) => {
      // Handle data events (todos, files) from the stream
      if (!dataItem || typeof dataItem !== "object") return;

      const item = dataItem as Record<string, unknown>;

      // Handle todo_update events
      if (item.type === "todo_update" && item.todos) {
        console.log("[ChatPage] Received todo_update:", (item.todos as unknown[]).length, "todos");
        const todosWithIds: Todo[] = (item.todos as Array<{ content: string; status: string; activeForm?: string; id?: string }>).map((todo, index) => ({
          id: todo.id || `todo-${index}-${Date.now()}`,
          content: todo.content,
          status: (todo.status as Todo["status"]) || "pending",
          activeForm: todo.activeForm,
        }));
        setTodos(todosWithIds);
        if (currentSessionIdRef.current) {
          saveTodos(currentSessionIdRef.current, todosWithIds);
        }
      }

      // Handle file_created events
      if (item.type === "file_created" && item.path) {
        console.log("[ChatPage] Received file_created:", item.path);
        handleFileCreated(item.path as string);
      }

      // Handle gdrive_file_created events
      if (item.type === "gdrive_file_created" && item.file_name) {
        console.log("[ChatPage] Received gdrive_file_created:", item.file_name);
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
          setGeneratedFiles((prev) => {
            if (prev.some((f) => f.driveId === item.drive_id)) return prev;
            return [...prev, file];
          });
          if (currentSessionIdRef.current) {
            saveGeneratedFile(currentSessionIdRef.current, file);
          }
        }
      }
    },
  });

  // Track loading state from status
  useEffect(() => {
    const loading = status === "submitted" || status === "streaming";
    setIsLoading(loading);
  }, [status]);

  // Track streaming content from chatMessages
  useEffect(() => {
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.role === "assistant") {
      const content = extractTextFromParts(lastMessage);
      if (content && !dbMessages.some((db) => db.content === content)) {
        setStreamingContent(content);
      }
    }
  }, [chatMessages, dbMessages, extractTextFromParts]);

  // Handle chat errors
  useEffect(() => {
    if (chatError) {
      console.error("Chat error:", chatError);
      setSessionStatus("error");
    }
  }, [chatError]);


  // Handle local file_created - auto-upload to Google Drive
  const handleFileCreated = async (path: string) => {
    const file: GeneratedFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      path,
      name: path.split("/").pop() || path,
      createdAt: new Date().toISOString(),
      uploadStatus: "pending" as FileUploadStatus,
    };

    setGeneratedFiles((prev) => [...prev, file]);

    // Save to database
    let dbFileId: string | null = null;
    if (currentSessionId) {
      dbFileId = await saveGeneratedFile(currentSessionId, file);
    }

    // Auto-upload to Google Drive if output_directory_id is configured
    if (team?.output_directory_id) {
      setGeneratedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, uploadStatus: "uploading" as FileUploadStatus } : f))
      );

      try {
        const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8230";
        const readRes = await fetch(`${agentUrl}/v1/files/read?path=${encodeURIComponent(path)}`);

        if (!readRes.ok) {
          throw new Error("Failed to read file from agent");
        }

        const fileData = await readRes.json();

        const uploadRes = await fetch("/api/workspace/drive/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: team.program.workspace_id,
            folderId: team.output_directory_id,
            fileName: fileData.name,
            content: fileData.content,
            mimeType: fileData.mime_type || "application/octet-stream",
          }),
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const uploadData = await uploadRes.json();

        setGeneratedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  uploadStatus: "completed" as FileUploadStatus,
                  driveId: uploadData.file.id,
                  driveUrl: uploadData.file.webViewLink,
                }
              : f
          )
        );

        if (dbFileId && currentSessionId) {
          await updateGeneratedFile(currentSessionId, dbFileId, {
            driveId: uploadData.file.id,
            driveUrl: uploadData.file.webViewLink,
            uploadStatus: "completed",
          });
        }
      } catch (err) {
        console.error("Auto-upload failed:", err);
        setGeneratedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, uploadStatus: "error" as FileUploadStatus, uploadError: (err as Error).message }
              : f
          )
        );

        if (dbFileId && currentSessionId) {
          await updateGeneratedFile(currentSessionId, dbFileId, { uploadStatus: "error" });
        }
      }
    }
  };

  // UI state
  const [activeTab, setActiveTab] = useState<"sessions" | "files" | "team" | "output">("sessions");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  // Mode selector state
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedMode, setSelectedMode] = useState<AgentMode>(getDefaultMode());
  const [currentMode, setCurrentMode] = useState<AgentMode | null>(null);

  // ESC key handler for stopping session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoading) {
        e.preventDefault();
        handleStopSession();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading]);

  // Fetch team data and pre-load team files
  useEffect(() => {
    async function fetchTeamData() {
      try {
        const supabase = createClient();

        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select(
            `
            id, name, output_directory_id, output_directory_name,
            program:programs!inner(
              id, name, workspace_id,
              google_drive_root_id, google_drive_root_name
            )
          `
          )
          .eq("id", teamId)
          .single();

        if (teamError) throw teamError;
        setTeam(teamData);

        // Check user's role for file delete permission
        const { data: { user } } = await supabase.auth.getUser();
        if (user && teamData.program.workspace_id) {
          const { data: membership } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", teamData.program.workspace_id)
            .eq("user_id", user.id)
            .single();

          if (membership && ["owner", "admin"].includes(membership.role)) {
            setCanDeleteFiles(true);
          }
        }

        // Fetch expanded files from cached API
        const filesRes = await fetch(`/api/teams/${teamId}/files`);
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          const expandedFiles: TeamFileRef[] = (filesData.files || []).map(
            (file: {
              ref_type: "file" | "folder";
              drive_id: string;
              drive_name: string;
              drive_path: string;
              mime_type: string | null;
              display_order: number;
            }) => ({
              id: `${file.drive_path}/${file.drive_id}`.replace(/^\//, ""),
              ref_type: file.ref_type,
              drive_id: file.drive_id,
              drive_name: file.drive_name,
              drive_path: file.drive_path,
              mime_type: file.mime_type,
              include_subfolders: false,
            })
          );
          setTeamFiles(expandedFiles);
        }
      } catch (err) {
        const e = err as Error;
        setError(e.message);
      } finally {
        setIsPageLoading(false);
      }
    }

    fetchTeamData();
  }, [teamId]);

  // Reload team files function
  const reloadTeamFiles = useCallback(async () => {
    setIsReloadingTeamFiles(true);
    try {
      const filesRes = await fetch(`/api/teams/${teamId}/files?refresh=${Date.now()}`);
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        const expandedFiles: TeamFileRef[] = (filesData.files || []).map(
          (file: {
            ref_type: "file" | "folder";
            drive_id: string;
            drive_name: string;
            drive_path: string;
            mime_type: string | null;
            display_order: number;
          }) => ({
            id: `${file.drive_path}/${file.drive_id}`.replace(/^\//, ""),
            ref_type: file.ref_type,
            drive_id: file.drive_id,
            drive_name: file.drive_name,
            drive_path: file.drive_path,
            mime_type: file.mime_type,
            include_subfolders: false,
          })
        );
        setTeamFiles(expandedFiles);
      }
    } catch (err) {
      console.error("Failed to reload team files:", err);
    } finally {
      setIsReloadingTeamFiles(false);
    }
  }, [teamId]);

  // Load session from URL parameter on mount
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get("session");
    if (sessionIdFromUrl && !currentSessionId) {
      async function validateAndLoadSession() {
        const supabase = createClient();
        const { data } = await supabase
          .from("chat_sessions")
          .select("id, mode, team_id, claude_session_id")
          .eq("id", sessionIdFromUrl)
          .eq("team_id", teamId)
          .single();

        if (data) {
          setCurrentSessionId(data.id);
          setClaudeSessionId(data.claude_session_id || null);
          if (data.mode) {
            const mode = getModeById(data.mode);
            setCurrentMode(mode || null);
          }
          // Load persisted session data
          const sessionData = await loadSessionData(data.id);
          setTodos(sessionData.todos);
          setGeneratedFiles(sessionData.files);
        } else {
          const newUrl = `/${slug}/programs/${programId}/teams/${teamId}/chat`;
          router.replace(newUrl, { scroll: false });
        }
      }
      validateAndLoadSession();
    }
  }, [searchParams, teamId, currentSessionId, slug, programId, router]);

  // Fetch messages when session changes
  useEffect(() => {
    if (!currentSessionId) {
      setDbMessages([]);
      setChatMessages([]);
      return;
    }

    async function fetchMessages() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("messages")
        .select(`
          id, role, content, file_attachments, created_at, user_id,
          user:users!messages_user_id_fkey(id, display_name, avatar_url)
        `)
        .eq("session_id", currentSessionId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const messagesWithUser = data.map((msg: {
          id: string;
          role: string;
          content: string;
          file_attachments: unknown;
          created_at: string;
          user_id: string | null;
          user: unknown;
        }) => ({
          ...msg,
          user: msg.user as Message["user"],
        }));
        setDbMessages(messagesWithUser as Message[]);
      }
    }

    fetchMessages();
  }, [currentSessionId, setChatMessages]);

  // Background session check - poll only when we have a claude session and not currently streaming
  useEffect(() => {
    if (!claudeSessionId || !currentSessionId || isLoading) return;

    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    async function checkBackgroundSession() {
      try {
        const res = await fetch(`/api/agent/sessions/${claudeSessionId}/status`);
        if (!res.ok || !mounted) return;

        const status = await res.json();

        if (status.status === "running") {
          setIsReconnecting(true);
          setSessionStatus("running");

          // Poll for updates while running in background
          pollInterval = setInterval(async () => {
            if (!mounted) return;

            const newRes = await fetch(`/api/agent/sessions/${claudeSessionId}/status`);
            if (!newRes.ok) return;

            const newStatus = await newRes.json();
            if (newStatus.status !== "running") {
              if (pollInterval) clearInterval(pollInterval);
              setIsReconnecting(false);
              setSessionStatus(newStatus.status);

              // Fetch final messages from buffer
              const bufferRes = await fetch(`/api/agent/sessions/${claudeSessionId}/buffer`);
              if (bufferRes.ok) {
                const buffer = await bufferRes.json();
                // Process buffered events if any
                if (buffer.events && Array.isArray(buffer.events)) {
                  // Get last content to save as assistant message
                  let finalContent = "";
                  for (const event of buffer.events) {
                    if (event.type === "content" && event.content) {
                      finalContent += event.content;
                    }
                  }
                  if (finalContent && currentSessionIdRef.current) {
                    const supabase = createClient();
                    await supabase.from("messages").insert({
                      session_id: currentSessionIdRef.current,
                      role: "assistant",
                      content: finalContent,
                    });
                    // Refresh messages
                    const { data } = await supabase
                      .from("messages")
                      .select("id, role, content, file_attachments, created_at")
                      .eq("session_id", currentSessionIdRef.current)
                      .order("created_at", { ascending: true });
                    if (data && mounted) {
                      setDbMessages(data as Message[]);
                    }
                  }
                }
              }
            }
          }, 2000);
        }
      } catch (err) {
        console.error("Error checking background session:", err);
      }
    }

    checkBackgroundSession();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [claudeSessionId, currentSessionId, isLoading]);

  // Create new session - show mode selector first
  const handleNewSession = useCallback(() => {
    setSelectedMode(getDefaultMode());
    setShowModeSelector(true);
  }, []);

  // Handle mode selection
  const handleModeSelect = (mode: AgentMode) => {
    setSelectedMode(mode);
  };

  // Handle mode confirm - create session with mode
  const handleModeConfirm = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        team_id: teamId,
        created_by: user?.id,
        mode: selectedMode.id,
      })
      .select("id")
      .single();

    if (!error && data) {
      setCurrentSessionId(data.id);
      setDbMessages([]);
      setChatMessages([]);
      setCurrentMode(selectedMode);
      setTodos([]);
      setGeneratedFiles([]);
      setClaudeSessionId(null);
      setSessionStatus("idle");

      const newUrl = `/${slug}/programs/${programId}/teams/${teamId}/chat?session=${data.id}`;
      router.push(newUrl, { scroll: false });

      sessionListRef.current?.refresh();
    }

    setShowModeSelector(false);
  }, [teamId, selectedMode, slug, programId, router, setChatMessages]);

  // Handle mode cancel
  const handleModeCancel = () => {
    setShowModeSelector(false);
  };

  // Handle direct mode selection from NewChatSelector
  const handleDirectModeSelect = useCallback(async (mode: AgentMode) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        team_id: teamId,
        created_by: user?.id,
        mode: mode.id,
      })
      .select("id")
      .single();

    if (!error && data) {
      setCurrentSessionId(data.id);
      setDbMessages([]);
      setChatMessages([]);
      setCurrentMode(mode);
      setTodos([]);
      setGeneratedFiles([]);
      setClaudeSessionId(null);
      setSessionStatus("idle");

      const newUrl = `/${slug}/programs/${programId}/teams/${teamId}/chat?session=${data.id}`;
      router.push(newUrl, { scroll: false });

      sessionListRef.current?.refresh();
    }
  }, [teamId, slug, programId, router, setChatMessages]);

  // Handle session deleted
  const handleSessionDeleted = useCallback(() => {
    setCurrentSessionId(null);
    setDbMessages([]);
    setChatMessages([]);
    setCurrentMode(null);
    setTodos([]);
    setGeneratedFiles([]);
    setClaudeSessionId(null);
    setSessionStatus("idle");

    const newUrl = `/${slug}/programs/${programId}/teams/${teamId}/chat`;
    router.push(newUrl, { scroll: false });
  }, [slug, programId, teamId, router, setChatMessages]);

  // Handle session selection
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setChatMessages([]);

    const newUrl = `/${slug}/programs/${programId}/teams/${teamId}/chat?session=${sessionId}`;
    router.push(newUrl, { scroll: false });

    const supabase = createClient();
    const { data } = await supabase
      .from("chat_sessions")
      .select("mode, claude_session_id")
      .eq("id", sessionId)
      .single();

    if (data?.mode) {
      const mode = getModeById(data.mode);
      setCurrentMode(mode || null);
    } else {
      setCurrentMode(null);
    }

    setClaudeSessionId(data?.claude_session_id || null);

    // Load persisted data
    const sessionData = await loadSessionData(sessionId);
    setTodos(sessionData.todos);
    setGeneratedFiles(sessionData.files);
    setSessionStatus("idle");
  }, [slug, programId, teamId, router, setChatMessages]);

  // Handle file selection for preview
  const handleFileSelect = useCallback((file: DriveFile) => {
    setPreviewFile({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
    });
  }, []);

  // Handle sending message
  const handleSend = async (content: string, files: FileReference[]) => {
    if (!team) return;

    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let currentUser: Message["user"] = null;

    if (authUser) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .eq("id", authUser.id)
        .single();

      if (userProfile) {
        currentUser = userProfile;
      }
    }

    // Auto-detect file mentions
    const detectedFiles = detectFileMentions(content, teamFiles);
    const allFiles = mergeFileReferences(files, detectedFiles);

    // Create session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          team_id: teamId,
          created_by: authUser?.id,
          title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          mode: currentMode?.id || "default",
        })
        .select("id")
        .single();

      if (sessionError || !newSession) return;
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);

      const newUrl = `/${slug}/programs/${programId}/teams/${teamId}/chat?session=${sessionId}`;
      router.push(newUrl, { scroll: false });

      sessionListRef.current?.refresh();
    }

    if (!sessionId) return;

    // Add user message optimistically
    const tempId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      role: "user",
      content,
      file_attachments: allFiles,
      created_at: new Date().toISOString(),
      user_id: authUser?.id || null,
      user: currentUser,
    };
    setDbMessages((prev) => [...prev, userMessage]);

    // Save user message
    const { data: savedMessage } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        role: "user",
        content,
        file_attachments: allFiles,
        user_id: authUser?.id || null,
      })
      .select("id")
      .single();

    if (savedMessage) {
      setDbMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: savedMessage.id } : m))
      );
    }

    // Update session title if first message
    if (dbMessages.length === 0) {
      await supabase
        .from("chat_sessions")
        .update({ title: content.slice(0, 50) + (content.length > 50 ? "..." : "") })
        .eq("id", sessionId);
    }

    // Build messages for Claude API
    const agentMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    // Build file context for system prompt
    const availableFiles = teamFiles.filter((f) => f.ref_type === "file").slice(0, 50);
    const workspaceId = team.program.workspace_id;
    const outputFolderId = team.output_directory_id || "";

    const driveFileRefs: DriveFileRef[] = availableFiles.map((f) => ({
      name: f.drive_name,
      mimeType: f.mime_type || "application/octet-stream",
      fileId: f.drive_id,
    }));

    const modeToUse = currentMode || getDefaultMode();
    const systemPromptContent = generateSystemPrompt(modeToUse, {
      workspaceId,
      outputFolderId,
      files: driveFileRefs,
    });

    agentMessages.push({ role: "system" as const, content: systemPromptContent });

    // Add previous messages
    agentMessages.push(
      ...dbMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );

    // Build current user message with file references
    let userMessageContent = content;
    if (allFiles.length > 0) {
      const fileRefs = allFiles.map((f) => ({
        name: f.name,
        file_id: f.id,
        mime_type: f.mimeType,
      }));
      userMessageContent = `${content}

---
**添付ファイル (Google Drive):**
${JSON.stringify(fileRefs, null, 2)}

上記のファイルを読み込むには、gdrive_read_file ツールを使用してください。
workspace_id="${workspaceId}", file_id="各ファイルのfile_id"`;
    }

    agentMessages.push({ role: "user" as const, content: userMessageContent });

    // Generate claude session ID
    const newClaudeSessionId = `agent-${sessionId}-${Date.now()}`;
    setClaudeSessionId(newClaudeSessionId);

    // Save to database
    await supabase
      .from("chat_sessions")
      .update({ claude_session_id: newClaudeSessionId })
      .eq("id", sessionId);

    // Reset state for new stream
    setTodos([]);
    setGeneratedFiles([]);
    setSessionStatus("running");
    setIsLoading(true);

    // Update transport with new session ID
    transportRef.current = new DefaultChatTransport({
      api: "/api/chat/completions",
      body: {
        messages: agentMessages,
        session_id: newClaudeSessionId,
        enable_tools: true,
      },
    });

    // Use sendMessage to send and start streaming (AI SDK v6 API)
    await sendMessage({ text: userMessageContent });
  };

  // Handle stop session
  const handleStopSession = async () => {
    stop();

    if (claudeSessionId) {
      try {
        await fetch(`/api/agent/sessions/${claudeSessionId}/stop`, {
          method: "POST",
        });
      } catch (err) {
        console.error("Error stopping session:", err);
      }
    }

    setSessionStatus("stopped");
  };

  // Loading state
  if (isPageLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !team) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <p className="text-destructive mb-4">{error || "Team not found"}</p>
        <Link href={`/${slug}/programs/${programId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Program
          </Button>
        </Link>
      </div>
    );
  }

  // Combine DB messages for display (streamingContent is already a state variable)
  const displayMessages = [...dbMessages];

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-background">
      {/* Mode Selector Modal */}
      <ModeSelector
        open={showModeSelector}
        selectedMode={selectedMode.id}
        onModeSelect={handleModeSelect}
        onCancel={handleModeCancel}
        onConfirm={handleModeConfirm}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative z-40 h-full w-72 sm:w-80 min-w-72 sm:min-w-80 max-w-72 sm:max-w-80 shrink-0 bg-background border-r transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <SidebarTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sessionsContent={
            <SessionList
              ref={sessionListRef}
              teamId={teamId}
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onNewSession={handleNewSession}
              onSessionDeleted={handleSessionDeleted}
            />
          }
          filesContent={
            <FolderTree
              workspaceId={team.program.workspace_id}
              rootFolderId={team.program.google_drive_root_id}
              rootFolderName={team.program.google_drive_root_name || undefined}
              onFileSelect={handleFileSelect}
              canDelete={canDeleteFiles}
            />
          }
          teamFilesContent={
            <TeamFileTree
              teamFiles={teamFiles}
              onFileSelect={(file) => {
                setPreviewFile({
                  id: file.drive_id,
                  name: file.drive_name,
                  mimeType: file.mime_type || "application/octet-stream",
                  webViewLink: undefined,
                });
              }}
              onReload={reloadTeamFiles}
              isReloading={isReloadingTeamFiles}
            />
          }
          outputContent={
            <FolderTree
              workspaceId={team.program.workspace_id}
              rootFolderId={team.output_directory_id}
              rootFolderName={team.output_directory_name || "Output"}
              onFileSelect={handleFileSelect}
              canDelete={canDeleteFiles}
            />
          }
        />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex h-full min-h-0 overflow-hidden">
        {/* Chat area */}
        <main className={cn(
          "flex flex-col h-full min-h-0 overflow-hidden transition-all duration-200",
          previewFile ? "flex-1 min-w-0" : "flex-1"
        )}>
          {/* Header */}
          <header className="shrink-0 border-b px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold truncate">{team.name}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {team.program.name}
              </p>
            </div>

            {/* Current Mode Badge */}
            {currentMode && currentMode.id !== "default" && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm shrink-0">
                <span>{currentMode.icon}</span>
                <span className="hidden sm:inline">{currentMode.name}</span>
              </div>
            )}

            {/* Agent Running Status Indicator */}
            {(isLoading || sessionStatus === "running" || isReconnecting) && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow-lg animate-pulse shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span className="font-semibold text-sm">
                  {isReconnecting ? "再接続中..." : "Agent 実行中"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 hover:bg-white/20 text-white border border-white/30"
                  onClick={handleStopSession}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  停止
                </Button>
              </div>
            )}
          </header>

          {/* Conditional content based on session state */}
          {!currentSessionId ? (
            <NewChatSelector onSelectMode={handleDirectModeSelect} />
          ) : (
            <>
              {/* Messages */}
              <MessageList
                messages={displayMessages}
                isLoading={isLoading}
                isStreaming={isLoading}
                streamingContent={streamingContent}
                sessionStatus={sessionStatus}
              />

              {/* Task Panel */}
              <div className="shrink-0">
                <TaskPanel
                  todos={todos}
                  generatedFiles={generatedFiles}
                  sessionStatus={sessionStatus}
                  onFilePreview={(file) => {
                    setPreviewFile({
                      id: file.driveId || file.id,
                      name: file.name,
                      mimeType: file.mimeType || "text/plain",
                      webViewLink: file.driveUrl,
                    });
                  }}
                  className="mx-3 sm:mx-4 mb-2"
                />
              </div>

              {/* Input */}
              <div className="shrink-0 border-t p-3 sm:p-4">
                <ChatInput
                  teamFiles={teamFiles}
                  onSend={handleSend}
                  isLoading={isLoading}
                  workspaceId={team.program.workspace_id}
                />
              </div>
            </>
          )}
        </main>

        {/* File Preview Panel */}
        {previewFile && (
          <aside className={cn(
            "shrink-0 h-full overflow-hidden transition-all duration-200",
            "w-[400px] lg:w-[500px] xl:w-[600px]"
          )}>
            <FilePreview
              file={previewFile}
              workspaceId={team.program.workspace_id}
              onClose={() => setPreviewFile(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
