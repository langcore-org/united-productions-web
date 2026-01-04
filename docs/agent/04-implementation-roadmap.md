# Implementation Roadmap

## Overview

Claude Chat UI改修の実装ロードマップ。5フェーズに分けて段階的に実装。

---

## Phase Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    Implementation Phases                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Phase 1: Foundation                                             │
│  ├── Project structure refactoring                               │
│  ├── Type definitions                                            │
│  ├── API client setup                                            │
│  └── Error handling foundation                                   │
│                                                                   │
│  Phase 2: Sessions API                                           │
│  ├── Database setup (PostgreSQL/Supabase)                        │
│  ├── Sessions CRUD implementation                                │
│  ├── Session list UI                                             │
│  └── Session detail UI                                           │
│                                                                   │
│  Phase 3: Skills Integration                                     │
│  ├── Skills definitions expansion                                │
│  ├── Skill execution logic                                       │
│  ├── SkillSelector component                                     │
│  └── Artifact display & download                                 │
│                                                                   │
│  Phase 4: Chat Enhancement                                       │
│  ├── Streaming support                                           │
│  ├── Tool execution display                                      │
│  ├── File artifact handling                                      │
│  └── Error recovery improvements                                 │
│                                                                   │
│  Phase 5: Polish & Optimization                                  │
│  ├── File browser (optional)                                     │
│  ├── Performance optimization                                    │
│  ├── Testing                                                     │
│  └── Documentation                                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation

### Goals
- プロジェクト構造の整理
- 型定義の確立
- APIクライアント基盤の構築
- エラーハンドリングパターンの確立

### Tasks

#### 1.1 Project Structure Refactoring

```
Current Structure → New Structure

src/                            src/
├── app/                        ├── app/
│   ├── page.tsx               │   ├── page.tsx
│   └── api/                   │   ├── layout.tsx
│       ├── chat/              │   ├── sessions/
│       └── skills/            │   │   ├── page.tsx
│                              │   │   └── [id]/page.tsx
├── components/                │   └── api/
│   └── ProductCard.tsx        │       ├── chat/route.ts
│                              │       ├── sessions/
├── lib/                       │       │   ├── route.ts
│   ├── catalog-loader.ts      │       │   └── [id]/route.ts
│   ├── system-prompts.ts      │       └── skills/
│   └── types/                 │           ├── route.ts
│       └── catalog.ts         │           └── execute/route.ts
│                              │
                               ├── components/
                               │   ├── chat/
                               │   │   ├── ChatContainer.tsx
                               │   │   ├── MessageBubble.tsx
                               │   │   ├── ChatInput.tsx
                               │   │   └── StreamingIndicator.tsx
                               │   ├── skills/
                               │   │   ├── SkillSelector.tsx
                               │   │   ├── SkillCard.tsx
                               │   │   └── SkillBadge.tsx
                               │   ├── sessions/
                               │   │   ├── SessionList.tsx
                               │   │   └── SessionItem.tsx
                               │   └── shared/
                               │       ├── ProductCard.tsx
                               │       ├── LoadingSpinner.tsx
                               │       └── ErrorBoundary.tsx
                               │
                               ├── lib/
                               │   ├── api/
                               │   │   ├── client.ts
                               │   │   ├── chat.ts
                               │   │   ├── sessions.ts
                               │   │   └── skills.ts
                               │   ├── db/
                               │   │   ├── client.ts
                               │   │   └── queries.ts
                               │   ├── skills/
                               │   │   ├── definitions/
                               │   │   │   ├── index.ts
                               │   │   │   ├── user-skills.ts
                               │   │   │   ├── example-skills.ts
                               │   │   │   ├── backend-skills.ts
                               │   │   │   └── essentials-skills.ts
                               │   │   ├── prompt-builder.ts
                               │   │   ├── tool-mappings.ts
                               │   │   └── artifact-parser.ts
                               │   ├── store/
                               │   │   ├── chatStore.ts
                               │   │   ├── sessionStore.ts
                               │   │   └── skillsStore.ts
                               │   ├── types/
                               │   │   ├── chat.ts
                               │   │   ├── session.ts
                               │   │   ├── skill.ts
                               │   │   └── catalog.ts
                               │   ├── utils/
                               │   │   ├── formatters.ts
                               │   │   └── validators.ts
                               │   ├── errors.ts
                               │   ├── catalog-loader.ts
                               │   └── system-prompts.ts
                               │
                               └── styles/
                                   └── globals.css
```

#### 1.2 Type Definitions

```typescript
// lib/types/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  skillId?: string;
  toolCalls?: ToolCall[];
  artifacts?: Artifact[];
  tokens?: { input: number; output: number };
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: string;
  error?: string;
}

export interface Artifact {
  type: 'file' | 'code' | 'image' | 'presentation';
  name: string;
  content?: string;
  path?: string;
  downloadUrl?: string;
  mimeType?: string;
  size?: number;
}

// lib/types/session.ts
export interface Session {
  id: string;
  title: string;
  skillId?: string;
  messages: Message[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  skillId?: string;
  messageCount: number;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
}

// lib/types/skill.ts
export interface Skill {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: SkillCategory;
  icon: string;
  color?: string;
  enabled: boolean;
  tags?: string[];
  systemPrompt?: string;
  toolMappings?: Record<string, string>;
  capabilities?: SkillCapability[];
}

export type SkillCategory =
  | 'user'
  | 'example'
  | 'backend'
  | 'essentials'
  | 'custom';
```

#### 1.3 API Client Setup

```typescript
// lib/api/client.ts
const API_BASE = '/api';

export class APIClient {
  private deviceId: string;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return '';

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': this.deviceId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(
        error.error?.code || 'UNKNOWN_ERROR',
        response.status,
        error.error?.message || 'Request failed'
      );
    }

    return response.json();
  }

  async *stream(
    endpoint: string,
    body: any
  ): AsyncGenerator<any> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': this.deviceId,
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!response.ok) {
      throw new APIError('STREAM_ERROR', response.status, 'Stream request failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('No response body');

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          yield JSON.parse(line.slice(6));
        }
      }
    }
  }
}

export const apiClient = new APIClient();
```

#### 1.4 Error Handling Foundation

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class APIError extends AppError {
  constructor(code: string, statusCode: number, message: string) {
    super(message, code, statusCode, statusCode >= 500);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, false, details);
  }
}

export class SessionError extends AppError {
  constructor(message: string) {
    super(message, 'SESSION_ERROR', 400, false);
  }
}

export class SkillError extends AppError {
  constructor(message: string, skillId: string) {
    super(`Skill ${skillId}: ${message}`, 'SKILL_ERROR', 400, false);
  }
}

// Error handler utility
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500, false);
  }

  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR', 500, false);
}
```

### Deliverables
- [ ] New project structure in place
- [ ] All type definitions created
- [ ] API client with error handling
- [ ] Basic tests for utilities

---

## Phase 2: Sessions API

### Goals
- PostgreSQL/Supabase接続設定
- Sessions CRUD API実装
- セッション管理UI構築

### Tasks

#### 2.1 Database Setup

```typescript
// lib/db/client.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export { pool };

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
```

```sql
-- migrations/001_create_sessions.sql
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT,
    title TEXT,
    skill_id TEXT,
    messages JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    message_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(messages)) STORED,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_device_id ON chat_sessions(device_id);
CREATE INDEX idx_sessions_updated_at ON chat_sessions(updated_at DESC);
```

#### 2.2 Session Queries

```typescript
// lib/db/queries.ts
import { pool } from './client';
import { Session, SessionSummary } from '@/lib/types';

export async function createSession(
  deviceId: string,
  skillId?: string
): Promise<Session> {
  const result = await pool.query(`
    INSERT INTO chat_sessions (device_id, skill_id)
    VALUES ($1, $2)
    RETURNING *
  `, [deviceId, skillId]);

  return mapRowToSession(result.rows[0]);
}

export async function getSession(id: string): Promise<Session | null> {
  const result = await pool.query(`
    SELECT * FROM chat_sessions WHERE id = $1
  `, [id]);

  if (result.rows.length === 0) return null;
  return mapRowToSession(result.rows[0]);
}

export async function listSessions(
  deviceId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ sessions: SessionSummary[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const [sessionsResult, countResult] = await Promise.all([
    pool.query(`
      SELECT
        id, title, skill_id, message_count,
        LEFT(messages->-1->>'content', 100) as last_message_preview,
        created_at, updated_at
      FROM chat_sessions
      WHERE device_id = $1 AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
    `, [deviceId, limit, offset]),
    pool.query(`
      SELECT COUNT(*) as total
      FROM chat_sessions
      WHERE device_id = $1 AND status = 'active'
    `, [deviceId]),
  ]);

  return {
    sessions: sessionsResult.rows.map(mapRowToSessionSummary),
    total: parseInt(countResult.rows[0].total),
  };
}

export async function addMessageToSession(
  sessionId: string,
  message: any
): Promise<void> {
  const messageWithId = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...message,
  };

  await pool.query(`
    UPDATE chat_sessions
    SET
      messages = messages || $1::jsonb,
      updated_at = NOW()
    WHERE id = $2
  `, [JSON.stringify(messageWithId), sessionId]);
}

export async function deleteSession(id: string): Promise<void> {
  await pool.query(`
    UPDATE chat_sessions
    SET status = 'deleted', updated_at = NOW()
    WHERE id = $1
  `, [id]);
}

function mapRowToSession(row: any): Session {
  return {
    id: row.id,
    title: row.title,
    skillId: row.skill_id,
    messages: row.messages || [],
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSessionSummary(row: any): SessionSummary {
  return {
    id: row.id,
    title: row.title,
    skillId: row.skill_id,
    messageCount: row.message_count,
    lastMessagePreview: row.last_message_preview,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

#### 2.3 Sessions API Routes

```typescript
// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSession, listSessions } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const deviceId = request.headers.get('x-device-id');
  if (!deviceId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Device ID required' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const result = await listSessions(deviceId, { limit, offset });

  return NextResponse.json({
    sessions: result.sessions,
    pagination: {
      total: result.total,
      limit,
      offset,
      hasMore: offset + limit < result.total,
    },
  });
}

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get('x-device-id');
  if (!deviceId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Device ID required' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const session = await createSession(deviceId, body.skillId);

  return NextResponse.json(session, { status: 201 });
}
```

#### 2.4 Session UI Components

```tsx
// components/sessions/SessionList.tsx
'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { SessionItem } from './SessionItem';

export function SessionList() {
  const { sessions, isLoading, fetchSessions } = useSessionStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (isLoading) {
    return <div className="session-list-loading">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="session-list-empty">
        <p>No conversations yet</p>
        <p className="text-sm text-gray-500">Start a new chat to see it here</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </div>
  );
}
```

### Deliverables
- [ ] Database connection configured
- [ ] Sessions table created with migrations
- [ ] CRUD API routes implemented
- [ ] Session list and detail UI components
- [ ] Integration tests for sessions

---

## Phase 3: Skills Integration

### Goals
- Skills定義の拡充
- Skill実行ロジックの改善
- Skill選択UIの実装

### Tasks

#### 3.1 Skills Definitions

```typescript
// lib/skills/definitions/index.ts
import { USER_SKILLS } from './user-skills';
import { EXAMPLE_SKILLS } from './example-skills';
import { BACKEND_SKILLS } from './backend-skills';
import { ESSENTIALS_SKILLS } from './essentials-skills';
import { Skill } from '@/lib/types/skill';

export const SKILLS: Skill[] = [
  ...USER_SKILLS,
  ...EXAMPLE_SKILLS,
  ...BACKEND_SKILLS,
  ...ESSENTIALS_SKILLS,
];

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find(s => s.id === id);
}

export function getSkillsByCategory(category: string): Skill[] {
  return SKILLS.filter(s => s.category === category);
}

export { USER_SKILLS, EXAMPLE_SKILLS, BACKEND_SKILLS, ESSENTIALS_SKILLS };
```

#### 3.2 Skill Execution

```typescript
// app/api/skills/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { getSkillById } from '@/lib/skills/definitions';
import { buildSkillPrompt } from '@/lib/skills/prompt-builder';
import { parseArtifacts } from '@/lib/skills/artifact-parser';
import { getSession, createSession, addMessageToSession } from '@/lib/db/queries';

const openai = new OpenAI({
  baseURL: process.env.CLIPROXY_URL || 'http://localhost:8317/v1',
  apiKey: process.env.CLIPROXY_API_KEY || 'sk-default',
});

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get('x-device-id');
  if (!deviceId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Device ID required' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { skillId, message, sessionId, context, stream } = body;

  // Validate skill
  const skill = getSkillById(skillId);
  if (!skill) {
    return NextResponse.json(
      { error: { code: 'SKILL_NOT_FOUND', message: `Skill ${skillId} not found` } },
      { status: 404 }
    );
  }

  // Get or create session
  let session = sessionId
    ? await getSession(sessionId)
    : await createSession(deviceId, skillId);

  if (!session) {
    return NextResponse.json(
      { error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } },
      { status: 404 }
    );
  }

  // Build prompt
  const systemPrompt = buildSkillPrompt(skill, context);

  // Prepare messages
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...session.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  // Handle streaming
  if (stream) {
    return handleStreamingExecution(session, messages, skill);
  }

  // Non-streaming execution
  const completion = await openai.chat.completions.create({
    model: process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929',
    messages,
    max_tokens: 8192,
  });

  const assistantContent = completion.choices[0].message.content || '';

  // Parse artifacts
  const artifacts = parseArtifacts(assistantContent);

  // Store messages
  await addMessageToSession(session.id, {
    role: 'user',
    content: message,
    skillId,
  });

  await addMessageToSession(session.id, {
    role: 'assistant',
    content: assistantContent,
    skillId,
    artifacts,
    tokens: {
      input: completion.usage?.prompt_tokens,
      output: completion.usage?.completion_tokens,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    skillId,
    content: assistantContent,
    artifacts,
  });
}
```

#### 3.3 Skill Selector UI

```tsx
// components/skills/SkillSelector.tsx
// (Full implementation in 03-skills-integration.md)
```

### Deliverables
- [ ] All 14+ skills defined with prompts
- [ ] Skill execution with artifact parsing
- [ ] SkillSelector component
- [ ] Skill badge and card components
- [ ] Skills API with filtering

---

## Phase 4: Chat Enhancement

### Goals
- ストリーミング対応
- ツール実行結果表示
- アーティファクトダウンロード

### Tasks

#### 4.1 Streaming Support

```typescript
// lib/hooks/useStreamingChat.ts
import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import { Message } from '@/lib/types';

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentContent, setCurrentContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    options: { sessionId?: string; skillId?: string } = {}
  ) => {
    // Add user message immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      skillId: options.skillId,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Start streaming
    setIsStreaming(true);
    setCurrentContent('');

    abortControllerRef.current = new AbortController();

    try {
      const stream = apiClient.stream('/chat', {
        message: content,
        ...options,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          fullContent += chunk.delta;
          setCurrentContent(fullContent);
        } else if (chunk.type === 'done') {
          // Add completed assistant message
          const assistantMessage: Message = {
            id: chunk.messageId,
            role: 'assistant',
            content: fullContent,
            skillId: options.skillId,
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          setCurrentContent('');
        } else if (chunk.type === 'error') {
          throw new Error(chunk.message);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    currentContent,
    sendMessage,
    stopStreaming,
  };
}
```

#### 4.2 Tool Execution Display

```tsx
// components/chat/ToolCallDisplay.tsx
'use client';

import { ToolCall } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

const TOOL_ICONS: Record<string, string> = {
  Read: '📖',
  Write: '✏️',
  Edit: '📝',
  Bash: '💻',
  Grep: '🔍',
  Glob: '📁',
  WebSearch: '🌐',
  WebFetch: '📥',
};

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const icon = TOOL_ICONS[toolCall.name] || '🔧';
  const hasError = !!toolCall.error;

  return (
    <div
      className={cn(
        'tool-call-display',
        hasError && 'tool-call-error'
      )}
    >
      <div className="tool-call-header">
        <span className="tool-icon">{icon}</span>
        <span className="tool-name">{toolCall.name}</span>
        {hasError ? (
          <span className="tool-status error">Failed</span>
        ) : (
          <span className="tool-status success">Done</span>
        )}
      </div>

      {toolCall.arguments && (
        <details className="tool-arguments">
          <summary>Arguments</summary>
          <pre>{JSON.stringify(toolCall.arguments, null, 2)}</pre>
        </details>
      )}

      {toolCall.result && (
        <details className="tool-result">
          <summary>Result</summary>
          <pre>{toolCall.result}</pre>
        </details>
      )}

      {toolCall.error && (
        <div className="tool-error">
          <strong>Error:</strong> {toolCall.error}
        </div>
      )}
    </div>
  );
}
```

#### 4.3 Artifact Display & Download

```tsx
// components/chat/ArtifactCard.tsx
'use client';

import { useState } from 'react';
import { Artifact } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ArtifactCardProps {
  artifact: Artifact;
}

const TYPE_ICONS: Record<string, string> = {
  file: '📄',
  code: '💻',
  image: '🖼️',
  presentation: '📊',
};

export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const icon = TYPE_ICONS[artifact.type] || '📄';

  const handleDownload = () => {
    if (artifact.downloadUrl) {
      window.open(artifact.downloadUrl, '_blank');
    } else if (artifact.content) {
      const blob = new Blob([artifact.content], { type: artifact.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-icon">{icon}</span>
        <span className="artifact-name">{artifact.name}</span>
        {artifact.size && (
          <span className="artifact-size">
            {formatBytes(artifact.size)}
          </span>
        )}
      </div>

      <div className="artifact-actions">
        {artifact.content && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="artifact-action"
          >
            {isExpanded ? 'Hide' : 'Preview'}
          </button>
        )}
        <button
          onClick={handleDownload}
          className="artifact-action primary"
        >
          Download
        </button>
      </div>

      {isExpanded && artifact.content && (
        <div className="artifact-preview">
          <pre>
            <code>{artifact.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

### Deliverables
- [ ] Streaming chat implementation
- [ ] Tool call visualization
- [ ] Artifact preview and download
- [ ] Error recovery with retry
- [ ] Loading states and animations

---

## Phase 5: Polish & Optimization

### Goals
- パフォーマンス最適化
- テスト追加
- ドキュメント整備

### Tasks

#### 5.1 Performance Optimization

```typescript
// lib/utils/performance.ts

// Debounce for search inputs
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Memoization for expensive computations
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  return ((...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Virtual list for long message histories
export function useVirtualList<T>(
  items: T[],
  containerRef: React.RefObject<HTMLElement>,
  itemHeight: number
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + 5
      );

      setVisibleRange({ start: Math.max(0, start - 5), end });
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length, itemHeight]);

  return {
    visibleItems: items.slice(visibleRange.start, visibleRange.end),
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.start * itemHeight,
  };
}
```

#### 5.2 Testing Strategy

```typescript
// __tests__/api/chat.test.ts
import { POST } from '@/app/api/chat/route';
import { createMockRequest } from '@/lib/test-utils';

describe('/api/chat', () => {
  it('should return response for valid message', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: { message: 'Hello' },
      headers: { 'x-device-id': 'test-device' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionId).toBeDefined();
    expect(data.content).toBeDefined();
  });

  it('should require device ID', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: { message: 'Hello' },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});

// __tests__/components/SkillSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillSelector } from '@/components/skills/SkillSelector';
import { SKILLS } from '@/lib/skills/definitions';

describe('SkillSelector', () => {
  it('should render all enabled skills', () => {
    render(
      <SkillSelector
        skills={SKILLS}
        selectedSkill={null}
        onSelect={() => {}}
      />
    );

    // Check for category headers
    expect(screen.getByText('User Skills')).toBeInTheDocument();
  });

  it('should call onSelect when skill is clicked', () => {
    const onSelect = jest.fn();
    render(
      <SkillSelector
        skills={SKILLS}
        selectedSkill={null}
        onSelect={onSelect}
      />
    );

    // Expand category and click skill
    fireEvent.click(screen.getByText('User Skills'));
    fireEvent.click(screen.getByText('Slidev Creator'));

    expect(onSelect).toHaveBeenCalledWith('slidev-creator');
  });
});

// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test('should send message and receive response', async ({ page }) => {
    await page.goto('/');

    // Type message
    await page.fill('[data-testid="chat-input"]', 'Hello, Claude!');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await expect(
      page.locator('[data-testid="assistant-message"]')
    ).toBeVisible({ timeout: 30000 });
  });

  test('should select and use skill', async ({ page }) => {
    await page.goto('/');

    // Open skill selector
    await page.click('[data-testid="skill-selector-toggle"]');

    // Select skill
    await page.click('[data-testid="skill-slidev-creator"]');

    // Verify skill badge
    await expect(
      page.locator('[data-testid="skill-badge"]')
    ).toContainText('Slidev Creator');

    // Send message
    await page.fill('[data-testid="chat-input"]', 'Create a presentation about AI');
    await page.click('[data-testid="send-button"]');

    // Wait for response with artifacts
    await expect(
      page.locator('[data-testid="artifact-card"]')
    ).toBeVisible({ timeout: 60000 });
  });
});
```

#### 5.3 Documentation

```markdown
# README.md updates

## Quick Start

1. Clone and install:
   ```bash
   git clone https://github.com/your-repo/claude-chat-ui.git
   cd claude-chat-ui
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. Set up database:
   ```bash
   npm run db:migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Features

- **Skills System**: Select from 14+ specialized skills
- **Session Management**: Persistent chat history with PostgreSQL
- **Streaming Responses**: Real-time streaming via SSE
- **Artifact Generation**: Code, files, presentations generated on-the-fly

## Architecture

See `/docs` for detailed documentation:
- `01-database-design.md` - Database schema and queries
- `02-api-design.md` - API endpoints and contracts
- `03-skills-integration.md` - Skills system implementation
- `04-implementation-roadmap.md` - This document
```

### Deliverables
- [ ] Performance optimizations implemented
- [ ] Unit tests (>80% coverage)
- [ ] E2E tests for critical flows
- [ ] API documentation
- [ ] User documentation
- [ ] Deployment guide

---

## Dependencies

```json
// package.json additions
{
  "dependencies": {
    "openai": "^4.x",
    "pg": "^8.x",
    "zustand": "^4.x",
    "zod": "^3.x",
    "@upstash/ratelimit": "^1.x",
    "@upstash/redis": "^1.x"
  },
  "devDependencies": {
    "@testing-library/react": "^14.x",
    "@playwright/test": "^1.x",
    "vitest": "^1.x"
  }
}
```

---

## Environment Variables

```bash
# .env.example

# CLIProxyAPI
CLIPROXY_URL=http://localhost:8317/v1
CLIPROXY_API_KEY=sk-your-api-key

# Database (PostgreSQL)
DATABASE_URL=postgres://user:pass@localhost:5432/chatdb

# Or Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# App Config
NEXT_PUBLIC_APP_NAME=Claude Chat UI
DEFAULT_MODEL=claude-sonnet-4-5-20250929
```

---

## Success Criteria

### Phase 1
- [ ] Project compiles without errors
- [ ] API client successfully connects to CLIProxyAPI
- [ ] Error handling catches and formats all errors

### Phase 2
- [ ] Sessions persist across browser refreshes
- [ ] Session list loads and displays correctly
- [ ] Session detail shows full message history

### Phase 3
- [ ] All 14 skills are selectable
- [ ] Skill execution returns appropriate responses
- [ ] Artifacts are correctly parsed and displayed

### Phase 4
- [ ] Streaming displays in real-time
- [ ] Tool calls are visualized
- [ ] Artifacts can be downloaded

### Phase 5
- [ ] PageSpeed score > 90
- [ ] Test coverage > 80%
- [ ] Documentation complete

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| CLIProxyAPI unavailable | High | Implement health checks, fallback UI |
| Database connection issues | High | Connection pooling, retry logic |
| Token limits exceeded | Medium | Chunking, summarization |
| Skill execution timeout | Medium | Timeout handling, progress indicators |
| Browser compatibility | Low | Progressive enhancement, polyfills |
