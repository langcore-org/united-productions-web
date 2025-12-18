'use client';

import { useChat } from 'ai/react';
import { Message } from 'ai';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TaskPanel } from './TaskPanel';
import { SessionStatusBadge } from './SessionStatusBadge';
import { useState, useCallback, useEffect, useRef } from 'react';
import { FileReference } from '@/types/file-reference';

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

interface GeneratedFile {
  path: string;
  createdAt: Date;
}

type SessionStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped';

interface SessionState {
  status: SessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  bufferedEventsCount: number;
}

interface BufferedEvent {
  id: number;
  type: string;  // Event type: content, todo_update, file_created
  data: {        // Already parsed JSON data from wrapper
    content?: string;
    todos?: TodoItem[];
    path?: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
}

interface ChatContainerProps {
  sessionId: string;
  initialMessages?: Message[];
  initialGeneratedFiles?: GeneratedFile[];
  initialTodos?: TodoItem[];
  mode?: string;
  systemPrompt?: string;
  model?: string;
}

export function ChatContainer({
  sessionId,
  initialMessages = [],
  initialGeneratedFiles = [],
  initialTodos = [],
  mode,
  systemPrompt,
  model,
}: ChatContainerProps) {
  const [attachedFiles, setAttachedFiles] = useState<FileReference[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>(initialGeneratedFiles);
  const todosInitializedRef = useRef(false);
  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'idle',
    startedAt: null,
    completedAt: null,
    bufferedEventsCount: 0,
  });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const lastEventIdRef = useRef<number>(0);

  const { messages, input, handleInputChange, isLoading, error, setInput, append, stop, data, setMessages } =
    useChat({
      api: '/api/chat',
      body: { sessionId, mode, systemPrompt, showThinking, model },
      initialMessages,
    });

  // Check session status and reconnect if needed
  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    async function checkAndReconnect() {
      if (!mounted) return;

      try {
        // Get session status from wrapper
        const statusRes = await fetch(`/api/sessions/${sessionId}/status`);
        const statusData = await statusRes.json();

        if (!mounted) return;

        const newState: SessionState = {
          status: statusData.status || 'idle',
          startedAt: statusData.started_at,
          completedAt: statusData.completed_at,
          bufferedEventsCount: statusData.buffered_events_count || 0,
        };
        setSessionState(newState);

        // If session has buffered events, fetch and apply them
        if (newState.bufferedEventsCount > 0 || newState.status === 'running' || newState.status === 'completed') {
          await fetchBufferedEvents();
        }

        // If session is still running, continue polling
        if (newState.status === 'running' && !isLoading) {
          setIsReconnecting(true);
          pollInterval = setInterval(async () => {
            if (!mounted) return;
            await fetchBufferedEvents();

            // Re-check status
            const newStatusRes = await fetch(`/api/sessions/${sessionId}/status`);
            const newStatusData = await newStatusRes.json();

            if (!mounted) return;

            setSessionState({
              status: newStatusData.status || 'idle',
              startedAt: newStatusData.started_at,
              completedAt: newStatusData.completed_at,
              bufferedEventsCount: newStatusData.buffered_events_count || 0,
            });

            // Stop polling if session completed
            if (newStatusData.status !== 'running') {
              setIsReconnecting(false);
              if (pollInterval) clearInterval(pollInterval);
            }
          }, 2000); // Poll every 2 seconds
        }
      } catch (err) {
        console.error('Failed to check session status:', err);
      }
    }

    async function fetchBufferedEvents() {
      try {
        const bufferRes = await fetch(
          `/api/sessions/${sessionId}/buffer?since_id=${lastEventIdRef.current}`
        );
        const bufferData = await bufferRes.json();

        if (!mounted) return;

        if (bufferData.events && bufferData.events.length > 0) {
          console.log('📦 Fetched buffered events:', bufferData.events.length);

          // Process buffered events
          for (const event of bufferData.events as BufferedEvent[]) {
            // Data is already parsed by the wrapper API
            const eventData = event.data;
            if (!eventData) continue;

            if (event.type === 'todo_update' && eventData.todos) {
              setTodos(eventData.todos);
            } else if (event.type === 'file_created' && eventData.path) {
              const filePath = eventData.path; // Already checked it exists
              setGeneratedFiles(prev => {
                if (prev.some(f => f.path === filePath)) return prev;
                return [...prev, { path: filePath, createdAt: new Date() }];
              });
            } else if (event.type === 'content' && eventData.content) {
              // Accumulate content into the last assistant message
              const content = eventData.content; // Already checked it exists
              const eventId = `buffered-${sessionId}-${event.id}`;
              setMessages(prev => {
                // Check if this event was already processed
                if (prev.some(m => m.id === eventId)) {
                  return prev;
                }
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id.startsWith('buffered-')) {
                  // Append to existing buffered assistant message
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: lastMsg.content + content },
                  ];
                } else {
                  // Create new assistant message
                  return [
                    ...prev,
                    { id: eventId, role: 'assistant' as const, content: content },
                  ];
                }
              });
            }
          }

          lastEventIdRef.current = bufferData.last_id;
        }
      } catch (err) {
        console.error('Failed to fetch buffered events:', err);
      }
    }

    // Check on mount and when sessionId changes
    checkAndReconnect();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, isLoading, setMessages]);

  // Debug: log data stream
  useEffect(() => {
    if (data && data.length > 0) {
      console.log('📋 Data stream received:', data);
    }
  }, [data]);

  // Handle data stream for todo updates and file_created events
  useEffect(() => {
    if (data && Array.isArray(data)) {
      // Process all data items
      for (let i = data.length - 1; i >= 0; i--) {
        const item = data[i] as { type?: string; todos?: TodoItem[]; path?: string };

        // Handle todo_update
        if (item && item.type === 'todo_update' && item.todos) {
          console.log('📋 Found todo_update:', item.todos);
          setTodos(item.todos);
          break; // Only take the latest todo update
        }
      }

      // Handle file_created events (collect all)
      const seenPaths = new Set(generatedFiles.map(f => f.path));
      for (const item of data) {
        const typedItem = item as { type?: string; path?: string };
        if (typedItem && typedItem.type === 'file_created' && typedItem.path) {
          if (!seenPaths.has(typedItem.path)) {
            console.log('📁 Found file_created:', typedItem.path);
            seenPaths.add(typedItem.path);
            setGeneratedFiles(prev => {
              // Check if already exists
              if (prev.some(f => f.path === typedItem.path)) return prev;
              return [...prev, { path: typedItem.path!, createdAt: new Date() }];
            });
          }
        }
      }
    }
  }, [data, generatedFiles]);

  // Update session state when loading state changes
  useEffect(() => {
    if (isLoading) {
      setSessionState(prev => ({ ...prev, status: 'running' }));
    }
  }, [isLoading]);

  // Save todos to database when they change (but not on initial load)
  useEffect(() => {
    // Skip the first render (initial load from initialTodos)
    if (!todosInitializedRef.current) {
      todosInitializedRef.current = true;
      // Only skip if we have initial todos - otherwise we want to save
      if (initialTodos.length > 0) {
        return;
      }
    }

    // Save todos to database
    if (todos.length > 0 && sessionId) {
      fetch(`/api/sessions/${sessionId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos }),
      }).catch(err => console.error('Failed to save todos:', err));
    }
  }, [todos, sessionId, initialTodos.length]);

  // Handle files attached from ChatInput
  const handleFilesAttached = useCallback((files: FileReference[]) => {
    setAttachedFiles(files);
  }, []);

  // Custom submit handler that includes file context
  const handleSubmitWithFiles = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!input.trim() && attachedFiles.length === 0) return;

      // Helper to load file content
      const loadFileContent = async (ref: FileReference): Promise<string> => {
        try {
          const res = await fetch(`/api/files/${encodeURIComponent(ref.path)}`);
          const data = await res.json();

          if (data.isPdf) {
            return `<file name="${ref.displayName}" type="pdf" absolutePath="${ref.absolutePath}">
IMPORTANT: This is a PDF file. To read it, use the Read tool with the absolute path: ${ref.absolutePath}
If the PDF is large, read it page by page or in sections to avoid buffer limits.
</file>`;
          }

          if (data.isBinary) {
            return `<file name="${ref.displayName}" type="image" absolutePath="${ref.absolutePath}">[Image file - use Read tool with path: ${ref.absolutePath}]</file>`;
          }

          return `<file name="${ref.displayName}" path="${ref.path}">\n${data.content}\n</file>`;
        } catch (error) {
          console.error('Failed to load file:', ref.path, error);
          return `<file name="${ref.displayName}" path="${ref.path}">[Error loading file]</file>`;
        }
      };

      // Helper to load directory contents
      const loadDirectoryContents = async (ref: FileReference): Promise<string> => {
        try {
          const res = await fetch(`/api/files/directory/${encodeURIComponent(ref.path)}`);
          const data = await res.json();

          if (!data.files || data.files.length === 0) {
            return `<directory name="${ref.displayName}" path="${ref.path}">[Empty directory]</directory>`;
          }

          // Load content for each file in the directory
          const fileContents: string[] = [];
          for (const file of data.files as { path: string; name: string; size: number }[]) {
            const fileRef: FileReference = {
              id: '',
              type: 'file',
              path: file.path,
              absolutePath: `${ref.absolutePath}/${file.name}`,
              displayName: file.name,
              size: file.size,
            };
            const content = await loadFileContent(fileRef);
            fileContents.push(content);
          }

          return `<directory name="${ref.displayName}" path="${ref.path}" fileCount="${data.fileCount}">\n${fileContents.join('\n\n')}\n</directory>`;
        } catch (error) {
          console.error('Failed to load directory:', ref.path, error);
          return `<directory name="${ref.displayName}" path="${ref.path}">[Error loading directory]</directory>`;
        }
      };

      // Reset last event ID for new conversation turn
      lastEventIdRef.current = 0;

      // Build message with file context
      let messageContent = input;

      if (attachedFiles.length > 0) {
        // Load content for all attached files/directories
        const fileContexts: string[] = [];

        for (const ref of attachedFiles) {
          if (ref.type === 'directory') {
            const dirContent = await loadDirectoryContents(ref);
            fileContexts.push(dirContent);
          } else {
            const fileContent = await loadFileContent(ref);
            fileContexts.push(fileContent);
          }
        }

        messageContent = `${fileContexts.join('\n\n')}\n\n${input}`;
      }

      // Clear input and attached files
      setInput('');
      setAttachedFiles([]);

      // Use append to send message with file context directly
      await append({
        role: 'user',
        content: messageContent,
      });
    },
    [input, attachedFiles, setInput, append]
  );

  // Stop running session
  const handleStop = useCallback(async () => {
    // First stop the local stream
    stop();

    // Then stop the background session
    try {
      await fetch(`/api/sessions/${sessionId}/stop`, { method: 'POST' });
      setSessionState(prev => ({ ...prev, status: 'stopped' }));
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  }, [stop, sessionId]);

  // Save response to file
  const handleSaveToFile = async (content: string) => {
    const filename = prompt('Enter filename:', `response_${Date.now()}.md`);
    if (!filename) return;

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });

      if (!res.ok) throw new Error('Failed to save file');

      const data = await res.json();
      alert(`Saved to: data/files/${data.file.path}`);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file');
    }
  };

  // Clear chat history
  const handleClearChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to clear messages');

      // Clear local state
      setMessages([]);
      setTodos([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  }, [sessionId, setMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* Session status badge */}
      <SessionStatusBadge
        status={sessionState.status}
        isReconnecting={isReconnecting}
        bufferedEventsCount={sessionState.bufferedEventsCount}
      />
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 px-4 py-2 text-sm">
          Error: {error.message}
        </div>
      )}
      <MessageList messages={messages} isLoading={isLoading || isReconnecting} onSaveToFile={handleSaveToFile} onClearChat={handleClearChat} />
      {/* Task panel with tabs for Tasks and Files */}
      <TaskPanel todos={todos} generatedFiles={generatedFiles} />
      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmitWithFiles}
        isLoading={isLoading || isReconnecting}
        onFilesAttached={handleFilesAttached}
        showThinking={showThinking}
        onShowThinkingChange={setShowThinking}
        onStop={handleStop}
      />
    </div>
  );
}
