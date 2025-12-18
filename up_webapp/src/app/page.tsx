'use client';

import { useState, useEffect } from 'react';
import { ChatContainer } from '@/components/chat';
import { SessionList } from '@/components/sessions/SessionList';
import { ModeSelector } from '@/components/modes/ModeSelector';
import { AgentMode, getDefaultMode, getModeById } from '@/lib/modes';
import { AVAILABLE_MODELS, DEFAULT_MODEL, ModelOption } from '@/lib/ai';
import { Message } from 'ai';

interface GeneratedFileData {
  id: number;
  session_id: string;
  file_path: string;
  created_at: string;
}

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [initialGeneratedFiles, setInitialGeneratedFiles] = useState<{ path: string; createdAt: Date }[]>([]);
  const [initialTodos, setInitialTodos] = useState<TodoItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedMode, setSelectedMode] = useState<AgentMode>(getDefaultMode());
  const [currentMode, setCurrentMode] = useState<AgentMode | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  // Generate new session ID on mount
  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  const handleNewSession = () => {
    // Show mode selector when creating new session
    setSelectedMode(getDefaultMode());
    setShowModeSelector(true);
  };

  const handleModeSelect = (mode: AgentMode) => {
    setSelectedMode(mode);
  };

  const handleModeConfirm = async () => {
    const newSessionId = crypto.randomUUID();

    // Create session with mode
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode.id,
          systemPrompt: selectedMode.systemPrompt,
        }),
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    }

    setSessionId(newSessionId);
    setInitialMessages([]);
    setInitialGeneratedFiles([]);
    setInitialTodos([]);
    setCurrentMode(selectedMode);
    setShowModeSelector(false);
  };

  const handleModeCancel = () => {
    setShowModeSelector(false);
  };

  const handleSessionSelect = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      const data = await res.json();
      setSessionId(id);
      setInitialMessages(
        data.messages.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      );

      // Load generated files from session
      if (data.generatedFiles && Array.isArray(data.generatedFiles)) {
        setInitialGeneratedFiles(
          data.generatedFiles.map((f: GeneratedFileData) => ({
            path: f.file_path,
            createdAt: new Date(f.created_at),
          }))
        );
      } else {
        setInitialGeneratedFiles([]);
      }

      // Load todos from session
      if (data.todos && Array.isArray(data.todos)) {
        setInitialTodos(data.todos);
      } else {
        setInitialTodos([]);
      }

      // Set current mode from session
      if (data.session.mode) {
        const mode = getModeById(data.session.mode);
        setCurrentMode(mode || null);
      } else {
        setCurrentMode(null);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  if (!sessionId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      {/* Mode Selector Modal */}
      {showModeSelector && (
        <ModeSelector
          selectedMode={selectedMode.id}
          onModeSelect={handleModeSelect}
          onCancel={handleModeCancel}
          onConfirm={handleModeConfirm}
        />
      )}

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative md:translate-x-0 z-40 w-80 h-full transition-transform duration-200 ease-in-out`}
      >
        <SessionList
          currentSessionId={sessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
        />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <main className="flex-1 flex flex-col h-full">
        <header className="border-b dark:border-gray-700 px-4 py-3 flex items-center gap-4">
          <div className="md:hidden w-8" /> {/* Spacer for mobile menu button */}
          <h1 className="text-lg font-semibold flex-1 text-center md:text-left">
            Claude Code Chat
          </h1>
          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          {currentMode && currentMode.id !== 'default' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm">
              <span>{currentMode.icon}</span>
              <span>{currentMode.name}</span>
            </div>
          )}
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatContainer
            key={sessionId}
            sessionId={sessionId}
            initialMessages={initialMessages}
            initialGeneratedFiles={initialGeneratedFiles}
            initialTodos={initialTodos}
            mode={currentMode?.id}
            systemPrompt={currentMode?.systemPrompt}
            model={selectedModel}
          />
        </div>
      </main>
    </div>
  );
}
