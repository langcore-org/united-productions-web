# Chat UI Integration Guide

## Overview

This guide explains how to connect a Next.js chat UI to the Claude Code OpenAI Wrapper.

## Project Structure

```
next-chat-ui-cc-wrapper/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts      # Main chat API endpoint
│   │   │   ├── files/
│   │   │   │   ├── route.ts      # List/Create files
│   │   │   │   └── [...path]/
│   │   │   │       └── route.ts  # Read/Delete file
│   │   │   └── sessions/
│   │   │       ├── route.ts      # List/Create sessions
│   │   │       └── [id]/
│   │   │           └── route.ts  # Get/Delete session
│   │   ├── layout.tsx
│   │   └── page.tsx              # Main page
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx # Chat with file handling
│   │   │   ├── ChatInput.tsx     # Input with @ file picker
│   │   │   ├── MessageList.tsx   # Message display
│   │   │   └── MessageBubble.tsx # Message with save button
│   │   ├── modes/
│   │   │   └── ModeSelector.tsx  # Agent mode selector
│   │   └── sessions/
│   │       └── SessionList.tsx   # Session sidebar
│   │
│   └── lib/
│       ├── ai.ts                 # AI client config
│       ├── db.ts                 # SQLite database
│       └── modes.ts              # Agent mode definitions
│
├── data/
│   ├── chat.db                   # SQLite database file
│   └── files/                    # User files directory
│       ├── *.json                # Data files
│       └── *.md                  # Markdown files
│
├── .env.local                    # Environment variables
└── package.json
```

## Environment Configuration

### .env.local

```env
# Claude Code OpenAI Wrapper Configuration
CLIPROXY_URL=http://localhost:8000/v1
CLIPROXY_API_KEY=not-needed

# Model
DEFAULT_MODEL=claude-sonnet-4-5-20250929

# Enable Claude Code tools (WebSearch, Read, Write, Bash, etc.)
ENABLE_TOOLS=true
```

## API Route Implementation

### src/app/api/chat/route.ts

```typescript
import { addMessage, createSession, getSession } from '@/lib/db';
import { getModeById } from '@/lib/modes';
import { randomUUID } from 'crypto';

// Configuration
const WRAPPER_URL = process.env.CLIPROXY_URL || 'http://localhost:8000/v1';
const API_KEY = process.env.CLIPROXY_API_KEY || 'not-needed';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929';
const ENABLE_TOOLS = process.env.ENABLE_TOOLS === 'true';

export async function POST(req: Request) {
  const { messages, sessionId, mode, systemPrompt } = await req.json();

  // Ensure session exists
  let sessionData = getSession(sessionId);
  if (!sessionData) {
    createSession(sessionId, undefined, mode, systemPrompt);
    sessionData = getSession(sessionId);
  }

  // Get system prompt from session or mode definition
  let finalSystemPrompt = sessionData?.session.system_prompt || systemPrompt;
  if (!finalSystemPrompt && mode) {
    const modeConfig = getModeById(mode);
    if (modeConfig) finalSystemPrompt = modeConfig.systemPrompt;
  }

  // Build messages array with system prompt
  let finalMessages = [...messages];
  if (finalSystemPrompt && !messages.some((m: { role: string }) => m.role === 'system')) {
    finalMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages,
    ];
  }

  // Save user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user') {
    addMessage(randomUUID(), sessionId, 'user', lastMessage.content);
  }

  // Build request body for wrapper
  const requestBody = {
    model: DEFAULT_MODEL,
    messages: finalMessages,
    stream: true,
    session_id: sessionId,
    ...(ENABLE_TOOLS && { enable_tools: true }),
  };

  // Call wrapper
  const response = await fetch(`${WRAPPER_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(JSON.stringify({ error }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Transform SSE to Vercel AI SDK format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullContent = '';

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            if (fullContent) {
              addMessage(randomUUID(), sessionId, 'assistant', fullContent);
            }
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    },
  });

  const stream = response.body?.pipeThrough(transformStream);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}
```

## Database Schema

### src/lib/db.ts

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'chat.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    mode TEXT DEFAULT 'default',
    system_prompt TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`);

// Session functions
export function createSession(
  id: string,
  title?: string,
  mode?: string,
  systemPrompt?: string
): Session {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, title, mode, system_prompt)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, title || null, mode || 'default', systemPrompt || null);
  return getSession(id)!.session;
}

export function getSession(id: string): { session: Session; messages: Message[] } | null {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
  if (!session) return null;

  const messages = db.prepare(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'
  ).all(id) as Message[];

  return { session, messages };
}

export function addMessage(
  id: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  const stmt = db.prepare(`
    INSERT INTO messages (id, session_id, role, content)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, sessionId, role, content);

  // Update session title if first user message
  const messages = db.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE session_id = ?'
  ).get(sessionId) as { count: number };

  if (messages.count === 1 && role === 'user') {
    const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    db.prepare('UPDATE sessions SET title = ?, updated_at = datetime("now") WHERE id = ?')
      .run(title, sessionId);
  } else {
    db.prepare('UPDATE sessions SET updated_at = datetime("now") WHERE id = ?')
      .run(sessionId);
  }
}
```

## Agent Modes

### src/lib/modes.ts

```typescript
export interface AgentMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

export const AGENT_MODES: AgentMode[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'General-purpose assistant',
    icon: '💬',
    systemPrompt: '',
  },
  {
    id: 'deep-research',
    name: 'Deep Research',
    description: 'In-depth research and analysis',
    icon: '🔬',
    systemPrompt: `You are a deep research agent...`,
  },
  {
    id: 'neta-researcher',
    name: 'ネタリサーチャー',
    description: 'TV番組制作のプロフェッショナルリサーチャー',
    icon: '📺',
    systemPrompt: `あなたはTV番組制作の現場を知り尽くした...`,
  },
  // Add more modes as needed
];

export function getModeById(id: string): AgentMode | undefined {
  return AGENT_MODES.find(mode => mode.id === id);
}
```

### Creating Custom Modes

When creating custom agent modes, follow these guidelines:

#### System Prompt Best Practices

1. **Don't specify tool names directly** - Claude Code will automatically select appropriate tools
   ```
   // Bad
   "Use Write tool to save the file"

   // Good
   "Save the report to `final_report.md`"
   ```

2. **Use natural language for actions**
   ```
   // Bad
   "Execute WebSearch to find information"

   // Good
   "Search the web for latest information on the topic"
   ```

3. **MCP tools require exact names** - Exception for MCP tools which need precise naming
   ```
   "Use mcp__sequential-thinking__sequentialthinking for structured reasoning"
   ```

#### Available Capabilities (Natural Language)

| Capability | How to Request |
|------------|----------------|
| Web search | "Search the web for..." |
| Read file | "Read the contents of..." |
| Write file | "Save/Write to `filename.md`" |
| Task management | "Create a task list for...", "Update the todo list" |
| Ask user | "Ask the user for clarification" |
| Fetch URL | "Get the content from URL" |

#### Example: Research Mode

```typescript
{
  id: 'custom-researcher',
  name: 'Custom Researcher',
  description: 'Research with structured thinking',
  icon: '🔍',
  systemPrompt: `You are a research specialist.

## Workflow
1. First, use mcp__sequential-thinking__sequentialthinking to plan your research
2. Search the web for relevant information
3. Analyze and synthesize findings
4. Save the final report to \`research_report.md\`

## Guidelines
- Always verify information from multiple sources
- Ask the user for clarification when needed
- Update your task list as you progress
`
}
```

## Frontend Components

### Using with Vercel AI SDK

```typescript
'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export function Chat({ sessionId, mode }: { sessionId: string; mode: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      sessionId,
      mode,
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`p-4 ${m.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <strong>{m.role === 'user' ? 'You' : 'Claude'}:</strong>
            <p>{m.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

## Running the Application

### Development

```bash
# Terminal 1: Start wrapper
cd claude-code-openai-wrapper
poetry run uvicorn src.main:app --reload --port 8000

# Terminal 2: Start chat UI
cd next-chat-ui-cc-wrapper
npm run dev -- -p 3007
```

### Access

- Chat UI: http://localhost:3007
- Wrapper API: http://localhost:8000
- Wrapper Health: http://localhost:8000/health

## Testing

### Manual Test

1. Open http://localhost:3007
2. Click "New Chat"
3. Select "Deep Research" mode
4. Ask: "Search for latest AI developments in 2024"
5. Claude should use WebSearch and return results

### API Test

```bash
curl -X POST http://localhost:3007/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "sessionId": "test-123",
    "mode": "default"
  }'
```

## File Load/Save Feature

The Chat UI supports loading files into conversations and saving Claude's responses to files.

### File Storage Location

Files are stored in `data/files/` directory within the Chat UI project:

```
next-chat-ui-cc-wrapper/
└── data/
    └── files/
        ├── plans.json
        ├── products.json
        └── response_*.md
```

### Claude Code Working Directory

To allow Claude Code to read/write files in the same directory, set `CLAUDE_CWD` in the wrapper's `.env`:

```env
# claude-code-openai-wrapper/.env
CLAUDE_CWD=/path/to/next-chat-ui-cc-wrapper/data/files
```

This ensures that when Claude Code saves files, they appear in the Chat UI's file list.

### Files API Endpoints

#### List Files

```bash
GET /api/files
GET /api/files?search=plans
```

Response:
```json
{
  "files": [
    {
      "name": "plans.json",
      "path": "plans.json",
      "size": 49340,
      "isDirectory": false,
      "modifiedAt": "2025-12-06T13:44:20.291Z"
    }
  ]
}
```

#### Read File Content

```bash
GET /api/files/plans.json
GET /api/files/subdir/file.txt
```

Response:
```json
{
  "name": "plans.json",
  "path": "plans.json",
  "content": "[{\"id\": \"...\"}]",
  "size": 49340,
  "modifiedAt": "2025-12-06T13:44:20.291Z"
}
```

#### Save File

```bash
POST /api/files
Content-Type: application/json

{
  "filename": "output.md",
  "content": "# Generated Report\n\nContent here..."
}
```

Response:
```json
{
  "file": {
    "path": "output.md",
    "size": 42
  }
}
```

#### Delete File

```bash
DELETE /api/files/output.md
```

### @ Mention File Picker

Users can attach files to messages using `@` mention:

1. Type `@` in the chat input
2. File picker dropdown appears
3. Search or select a file
4. File content is attached to the message

**Implementation: ChatInput.tsx**

```typescript
// Detect @ trigger
const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const value = e.target.value;
  const cursorPos = e.target.selectionStart;

  const lastChar = value[cursorPos - 1];
  const charBefore = cursorPos > 1 ? value[cursorPos - 2] : ' ';

  // Show file picker when @ is typed after space/newline
  if (lastChar === '@' && (charBefore === ' ' || charBefore === '\n' || cursorPos === 1)) {
    setShowFilePicker(true);
    setMentionStartPos(cursorPos - 1);
    fetchFiles();
  }
};

// Select file and load content
const selectFile = async (file: FileInfo) => {
  const res = await fetch(`/api/files/${encodeURIComponent(file.path)}`);
  const data = await res.json();

  const newAttached = {
    path: file.path,
    name: file.name,
    content: data.content,
  };

  setAttachedFiles([...attachedFiles, newAttached]);
  onFilesAttached?.([...attachedFiles, newAttached]);
};
```

### File Context in Messages

When files are attached, their content is injected into the message using XML tags:

**Implementation: ChatContainer.tsx**

```typescript
const handleSubmitWithFiles = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  let messageContent = input;

  if (attachedFiles.length > 0) {
    const fileContexts = attachedFiles
      .map((f) => `<file name="${f.name}" path="${f.path}">\n${f.content}\n</file>`)
      .join('\n\n');

    messageContent = `${fileContexts}\n\n${input}`;
  }

  // Use append to send message with file context
  await append({
    role: 'user',
    content: messageContent,
  });
};
```

**Example Message Sent to Claude:**

```
<file name="plans.json" path="plans.json">
[{"id": "plan_1", "name": "Basic Plan"}, ...]
</file>

Summarize this data in markdown format.
```

### Save Response to File

Assistant messages have a "Save to File" button that saves the response content:

**Implementation: MessageBubble.tsx**

```typescript
const handleSave = () => {
  onSaveToFile?.(message.content);
};

// In render:
{!isUser && showActions && (
  <div className="flex gap-2 mt-2 pt-2 border-t">
    <button onClick={handleCopy}>📋 Copy</button>
    <button onClick={handleSave}>💾 Save to File</button>
  </div>
)}
```

**ChatContainer.tsx handles the save:**

```typescript
const handleSaveToFile = async (content: string) => {
  const filename = prompt('Enter filename:', `response_${Date.now()}.md`);
  if (!filename) return;

  const res = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content }),
  });

  if (res.ok) {
    const data = await res.json();
    alert(`Saved to: data/files/${data.file.path}`);
  }
};
```

### Security Considerations

The Files API includes path traversal protection:

```typescript
// Prevent directory traversal attacks
const resolvedPath = path.resolve(filePath);
if (!resolvedPath.startsWith(path.resolve(FILES_DIR))) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

### Usage Flow

1. **Load File**: Type `@`, select file → File content attached to message
2. **Send**: Message with `<file>` tags sent to Claude
3. **Process**: Claude reads file content and responds
4. **Save**: Click "Save to File" on Claude's response
5. **Access**: Saved file appears in `@` picker for future use
