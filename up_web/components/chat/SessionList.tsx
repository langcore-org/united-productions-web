"use client";

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, MessageSquare, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModeById } from "@/lib/modes";

interface SessionParticipant {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SessionBase {
  id: string;
  title: string | null;
  status: string;
  mode: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  claude_session_id: string | null;
}

interface Session extends SessionBase {
  participants?: SessionParticipant[];
  isAgentRunning?: boolean;
}

interface SessionListProps {
  teamId: string;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onSessionDeleted?: () => void;
}

export interface SessionListRef {
  refresh: () => Promise<void>;
}

export const SessionList = forwardRef<SessionListRef, SessionListProps>(
  function SessionList(
    { teamId, currentSessionId, onSessionSelect, onNewSession, onSessionDeleted },
    ref
  ) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

    // Check if an agent session is running
    const checkAgentStatus = async (claudeSessionId: string): Promise<boolean> => {
      try {
        const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8230';
        const res = await fetch(`${agentUrl}/v1/sessions/${claudeSessionId}/status`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.status === 'running';
      } catch {
        return false;
      }
    };

    const fetchSessions = useCallback(async () => {
      const supabase = createClient();

      // Fetch sessions including claude_session_id for running status check
      const { data: sessionsData, error } = await supabase
        .from("chat_sessions")
        .select("id, title, status, mode, message_count, created_at, updated_at, claude_session_id")
        .eq("team_id", teamId)
        .order("updated_at", { ascending: false });

      if (error || !sessionsData) {
        setIsLoading(false);
        return;
      }

      // Fetch participants for all sessions
      const sessionIds = (sessionsData as SessionBase[]).map((s) => s.id);

      if (sessionIds.length > 0) {
        // Get unique users who sent messages in these sessions
        const { data: messagesData } = await supabase
          .from("messages")
          .select(`
            session_id,
            user_id,
            user:users!messages_user_id_fkey(id, display_name, avatar_url)
          `)
          .in("session_id", sessionIds)
          .eq("role", "user")
          .not("user_id", "is", null);

        // Group participants by session
        const participantsBySession = new Map<string, SessionParticipant[]>();

        if (messagesData) {
          for (const msg of messagesData) {
            if (!msg.user || !msg.user_id) continue;

            const sessionId = msg.session_id;
            if (!participantsBySession.has(sessionId)) {
              participantsBySession.set(sessionId, []);
            }

            const participants = participantsBySession.get(sessionId)!;
            // Add user if not already in list
            if (!participants.some(p => p.id === msg.user_id)) {
              const user = msg.user as unknown as SessionParticipant;
              participants.push({
                id: user.id,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
              });
            }
          }
        }

        // Merge participants into sessions
        const sessionsWithParticipants = (sessionsData as SessionBase[]).map((session) => ({
          ...session,
          participants: participantsBySession.get(session.id) || [],
        }));

        setSessions(sessionsWithParticipants);

        // Check running status for sessions with claude_session_id (async, non-blocking)
        const sessionsWithAgentId = sessionsWithParticipants.filter(s => s.claude_session_id);
        if (sessionsWithAgentId.length > 0) {
          Promise.all(
            sessionsWithAgentId.map(async (session) => {
              const isRunning = await checkAgentStatus(session.claude_session_id!);
              return { id: session.id, isRunning };
            })
          ).then((results) => {
            const runningMap = new Map(results.map(r => [r.id, r.isRunning]));
            setSessions(prev => prev.map(s => ({
              ...s,
              isAgentRunning: runningMap.get(s.id) ?? false,
            })));
          });
        }
      } else {
        setSessions(sessionsData as Session[]);

        // Check running status for sessions with claude_session_id (async, non-blocking)
        const sessionsWithAgentId = (sessionsData as SessionBase[]).filter(s => s.claude_session_id);
        if (sessionsWithAgentId.length > 0) {
          Promise.all(
            sessionsWithAgentId.map(async (session) => {
              const isRunning = await checkAgentStatus(session.claude_session_id!);
              return { id: session.id, isRunning };
            })
          ).then((results) => {
            const runningMap = new Map(results.map(r => [r.id, r.isRunning]));
            setSessions(prev => prev.map(s => ({
              ...s,
              isAgentRunning: runningMap.get(s.id) ?? false,
            })));
          });
        }
      }

      setIsLoading(false);
    }, [teamId]);

    useImperativeHandle(ref, () => ({
      refresh: fetchSessions,
    }));

    useEffect(() => {
      fetchSessions();
    }, [fetchSessions]);

    const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();

      if (deleteConfirmId !== sessionId) {
        setDeleteConfirmId(sessionId);
        return;
      }

      const supabase = createClient();
      await supabase.from("chat_sessions").delete().eq("id", sessionId);

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setDeleteConfirmId(null);

      if (sessionId === currentSessionId) {
        onSessionDeleted?.();
      }
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteConfirmId(null);
    };

    const handleStartEdit = (e: React.MouseEvent, session: Session) => {
      e.stopPropagation();
      setEditingId(session.id);
      setEditValue(session.title || "");
      // Focus input after render
      setTimeout(() => editInputRef.current?.focus(), 0);
    };

    const handleSaveEdit = async (sessionId: string) => {
      const trimmedValue = editValue.trim();
      if (!trimmedValue) {
        setEditingId(null);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("chat_sessions")
        .update({ title: trimmedValue })
        .eq("id", sessionId);

      if (!error) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, title: trimmedValue } : s
          )
        );
      }
      setEditingId(null);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveEdit(sessionId);
      } else if (e.key === "Escape") {
        setEditingId(null);
      }
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return date.toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (days === 1) {
        return "昨日";
      } else if (days < 7) {
        return `${days}日前`;
      } else {
        return date.toLocaleDateString("ja-JP", {
          month: "short",
          day: "numeric",
        });
      }
    };

    const getModeInfo = (modeId: string | null) => {
      if (!modeId || modeId === "default") return null;
      const mode = getModeById(modeId);
      if (!mode) return null;
      return { icon: mode.icon, name: mode.name };
    };

    const getInitials = (name: string | null) => {
      if (!name) return "?";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="p-3 border-b shrink-0">
          <Button onClick={onNewSession} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            新規チャット
          </Button>
        </div>

        <ScrollArea className="flex-1 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">セッションはまだありません</p>
              <p className="text-xs text-muted-foreground mt-1">
                新しいチャットを始めてください
              </p>
            </div>
          ) : (
            <div className="py-2 w-full overflow-hidden">
              {sessions.map((session) => {
                const modeInfo = getModeInfo(session.mode);
                const participants = session.participants || [];
                const displayParticipants = participants.slice(0, 5);
                const remainingCount = participants.length - 5;

                return (
                  <div
                    key={session.id}
                    onClick={() => onSessionSelect(session.id)}
                    className={cn(
                      "group px-3 py-2 cursor-pointer transition-colors overflow-hidden",
                      "hover:bg-muted",
                      currentSessionId === session.id &&
                        "bg-muted border-l-2 border-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        {/* Title */}
                        {editingId === session.id ? (
                          <Input
                            ref={editInputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(session.id)}
                            onKeyDown={(e) => handleEditKeyDown(e, session.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 text-sm px-1 py-0"
                            placeholder="セッションタイトル"
                          />
                        ) : (
                          <div className="flex items-center gap-1 group/title min-w-0">
                            {/* Running indicator */}
                            {session.isAgentRunning && (
                              <span className="relative flex h-2 w-2 shrink-0" title="エージェント実行中">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                            )}
                            <p className="text-sm font-medium truncate flex-1 min-w-0">
                              {session.title || "新規チャット"}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => handleStartEdit(e, session)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {/* Agent mode badge */}
                        {modeInfo && (
                          <div className="flex items-center gap-1 mt-1 overflow-hidden">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs max-w-full overflow-hidden">
                              <span className="shrink-0">{modeInfo.icon}</span>
                              <span className="truncate">{modeInfo.name}</span>
                            </span>
                          </div>
                        )}

                        {/* Meta info and participants */}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(session.updated_at)}
                            </span>
                            {session.message_count > 0 && (
                              <span className="text-xs text-muted-foreground">
                                · {session.message_count} msgs
                              </span>
                            )}
                          </div>

                          {/* Participant avatars */}
                          {displayParticipants.length > 0 && (
                            <div className="flex items-center -space-x-1.5">
                              {displayParticipants.map((participant) => (
                                <Avatar
                                  key={participant.id}
                                  className="h-5 w-5 border-2 border-background"
                                >
                                  <AvatarImage
                                    src={participant.avatar_url || undefined}
                                    alt={participant.display_name || "User"}
                                  />
                                  <AvatarFallback className="text-[10px] bg-muted">
                                    {getInitials(participant.display_name)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {remainingCount > 0 && (
                                <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                  <span className="text-[9px] text-muted-foreground">
                                    +{remainingCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {deleteConfirmId === session.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => handleDelete(e, session.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={handleCancelDelete}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleDelete(e, session.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }
);
