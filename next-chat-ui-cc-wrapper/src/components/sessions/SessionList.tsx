'use client';

import { useEffect, useState, useCallback } from 'react';
import { getModeById } from '@/lib/modes';

interface Session {
  id: string;
  title: string | null;
  mode?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

type SessionStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped';

interface SessionStatusInfo {
  status: SessionStatus;
}

interface SessionListProps {
  currentSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionList({
  currentSessionId,
  onSessionSelect,
  onNewSession,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningSessionIds, setRunningSessionIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check status for all sessions to find running ones
  const checkSessionStatuses = useCallback(async (sessionList: Session[]) => {
    const runningIds = new Set<string>();

    // Check status for each session in parallel
    const statusPromises = sessionList.map(async (session) => {
      try {
        const res = await fetch(`/api/sessions/${session.id}/status`);
        const data: SessionStatusInfo = await res.json();
        if (data.status === 'running') {
          runningIds.add(session.id);
        }
      } catch (error) {
        // Ignore errors for individual session status checks
      }
    });

    await Promise.all(statusPromises);
    setRunningSessionIds(runningIds);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]);

  // Check for running sessions after sessions are loaded
  useEffect(() => {
    if (sessions.length > 0) {
      checkSessionStatuses(sessions);
    }
  }, [sessions, checkSessionStatuses]);

  // Poll for running session status updates
  useEffect(() => {
    if (runningSessionIds.size === 0) return;

    const pollInterval = setInterval(() => {
      checkSessionStatuses(sessions);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [runningSessionIds.size, sessions, checkSessionStatuses]);

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setConfirmDeleteId(sessionId);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setConfirmDeleteId(null);

    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (sessionId === currentSessionId) {
        onNewSession();
      } else {
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const getModeInfo = (mode?: string) => {
    if (!mode || mode === 'default') return null;
    const modeConfig = getModeById(mode);
    if (!modeConfig) return null;
    return { icon: modeConfig.icon, name: modeConfig.name };
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-4 border-b dark:border-gray-700">
        <button
          onClick={onNewSession}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No sessions yet</div>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {sessions.map((session) => {
              const modeInfo = getModeInfo(session.mode);
              const isRunning = runningSessionIds.has(session.id);
              return (
                <li
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    session.id === currentSessionId
                      ? 'bg-blue-50 dark:bg-gray-800 border-l-4 border-blue-600'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      {/* Mode badge */}
                      {modeInfo && (
                        <div className="mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                            <span>{modeInfo.icon}</span>
                            <span>{modeInfo.name}</span>
                          </span>
                        </div>
                      )}
                      <div className="font-medium truncate flex items-center gap-2">
                        {/* Running indicator with animated pulse */}
                        {isRunning && (
                          <span className="relative flex h-2 w-2 mr-1" title="Running in background">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                        )}
                        {session.title || 'New Chat'}
                      </div>
                      {session.last_message && (
                        <div className="text-sm text-gray-500 truncate mt-1">
                          {session.last_message}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        {(() => {
                          const d = new Date(session.updated_at);
                          const pad = (n: number) => n.toString().padStart(2, '0');
                          return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        })()}
                        {isRunning && (
                          <span className="text-blue-500 font-medium">Running</span>
                        )}
                      </div>
                    </div>
                    {confirmDeleteId === session.id ? (
                      <div className="ml-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleConfirmDelete(e, session.id)}
                          className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteClick(e, session.id)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
