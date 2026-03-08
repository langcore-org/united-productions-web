# API Design Document

## Overview

Next.js API Routes設計書。CLIProxyAPI経由でClaude Codeと通信し、セッション管理・Skills実行を提供する。

---

## 1. API Architecture

### 1.1 Endpoint Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Routes Structure                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /api                                                            │
│  ├── /chat                    POST    Chat completions           │
│  │   └── /stream              GET     SSE streaming              │
│  │                                                               │
│  ├── /sessions                                                   │
│  │   ├── GET                  List sessions                      │
│  │   ├── POST                 Create session                     │
│  │   └── /[id]                                                   │
│  │       ├── GET              Get session                        │
│  │       ├── PUT              Update session                     │
│  │       ├── DELETE           Delete session                     │
│  │       └── /messages                                           │
│  │           └── POST         Add message                        │
│  │                                                               │
│  ├── /skills                                                     │
│  │   ├── GET                  List skills                        │
│  │   ├── /[id]                                                   │
│  │   │   └── GET              Get skill details                  │
│  │   └── /execute                                                │
│  │       └── POST             Execute skill                      │
│  │                                                               │
│  └── /files                   (Optional)                         │
│      ├── GET                  List files                         │
│      └── /[...path]                                              │
│          ├── GET              Read file                          │
│          └── PUT              Write file                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Authentication Flow

```
┌──────────┐         ┌──────────────┐         ┌─────────────┐
│  Client  │ ──1──▶  │  Next.js API │ ──2──▶  │ CLIProxyAPI │
│          │         │              │         │             │
│          │         │   Headers:   │         │  Headers:   │
│          │         │   - Cookie   │         │  - X-API-Key│
│          │         │   - X-Device │         │             │
└──────────┘         └──────────────┘         └─────────────┘

1. Client sends request with session cookie and device ID
2. API validates session, adds CLIProxyAPI key, forwards request
```

---

## 2. Chat API

### 2.1 POST /api/chat

Main chat endpoint for sending messages and receiving responses.

**Request:**

```typescript
interface ChatRequest {
  // Message content
  message: string;

  // Session management
  sessionId?: string;           // Existing session ID (optional)

  // Skill configuration
  skillId?: string;             // Skill to use (optional)

  // Response options
  stream?: boolean;             // Enable SSE streaming (default: false)

  // Context (optional)
  context?: {
    files?: string[];           // Relevant file paths
    products?: string[];        // Product IDs for catalog
    instructions?: string;      // Additional instructions
  };
}
```

**Response (non-streaming):**

```typescript
interface ChatResponse {
  // Identifiers
  sessionId: string;
  messageId: string;

  // Response content
  content: string;

  // Skill info
  skillId?: string;

  // Tool execution results
  toolCalls?: ToolCall[];

  // Generated artifacts
  artifacts?: Artifact[];

  // Catalog references (if applicable)
  products?: Product[];
  plans?: Plan[];

  // Usage stats
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: string;
  error?: string;
}

interface Artifact {
  type: 'file' | 'code' | 'image' | 'presentation';
  name: string;
  content?: string;           // For code/small files
  path?: string;              // For stored files
  downloadUrl?: string;       // Presigned URL
  mimeType?: string;
  size?: number;
}
```

**Response (streaming):**

```typescript
// Server-Sent Events format
// Content-Type: text/event-stream

// Message chunks
data: {"type":"content","delta":"Hello"}
data: {"type":"content","delta":", how"}
data: {"type":"content","delta":" can I help?"}

// Tool calls
data: {"type":"tool_start","name":"Read","id":"call_001"}
data: {"type":"tool_result","id":"call_001","result":"..."}

// Completion
data: {"type":"done","messageId":"msg_123","usage":{"inputTokens":100,"outputTokens":50}}

// Error
data: {"type":"error","code":"RATE_LIMIT","message":"Too many requests"}
```

**Implementation:**

```typescript
// app/api/chat/route.ts
import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/client';
import { buildSkillPrompt } from '@/lib/skills';
import { ChatRequest, ChatResponse } from '@/lib/types';

const openai = new OpenAI({
  baseURL: process.env.CLIPROXY_URL || 'http://localhost:8317/v1',
  apiKey: process.env.CLIPROXY_API_KEY || 'sk-default',
});

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, sessionId, skillId, stream, context } = body;

    // 1. Get or create session
    let session = sessionId
      ? await getSession(sessionId)
      : await createSession({ skillId });

    // 2. Build messages array with history
    const systemPrompt = skillId
      ? buildSkillPrompt(skillId, context)
      : buildDefaultPrompt(context);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 3. Handle streaming vs non-streaming
    if (stream) {
      return handleStreamingResponse(session, messages, skillId);
    }

    // 4. Non-streaming response
    const completion = await openai.chat.completions.create({
      model: process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929',
      messages,
      max_tokens: 4096,
    });

    const assistantMessage = completion.choices[0].message;

    // 5. Store messages in session
    await addMessagesToSession(session.id, [
      { role: 'user', content: message, skillId },
      {
        role: 'assistant',
        content: assistantMessage.content || '',
        model: completion.model,
        tokens: {
          input: completion.usage?.prompt_tokens,
          output: completion.usage?.completion_tokens,
        },
      },
    ]);

    // 6. Return response
    return NextResponse.json({
      sessionId: session.id,
      messageId: generateMessageId(),
      content: assistantMessage.content,
      skillId,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handleStreamingResponse(
  session: Session,
  messages: Message[],
  skillId?: string
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await openai.chat.completions.create({
          model: process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929',
          messages,
          stream: true,
        });

        let fullContent = '';

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                delta,
              })}\n\n`)
            );
          }
        }

        // Store message after streaming completes
        await addMessagesToSession(session.id, [
          { role: 'assistant', content: fullContent, skillId },
        ]);

        // Send completion event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            messageId: generateMessageId(),
          })}\n\n`)
        );

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            code: 'STREAM_ERROR',
            message: error.message,
          })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 3. Sessions API

### 3.1 GET /api/sessions

List all sessions for the current user.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Max sessions to return |
| `offset` | number | 0 | Pagination offset |
| `skillId` | string | - | Filter by skill |
| `status` | string | active | Filter by status |
| `search` | string | - | Search in titles/messages |

**Response:**

```typescript
interface SessionsListResponse {
  sessions: SessionSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface SessionSummary {
  id: string;
  title: string;
  skillId?: string;
  skillName?: string;
  messageCount: number;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
}
```

**Implementation:**

```typescript
// app/api/sessions/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const skillId = searchParams.get('skillId');
  const status = searchParams.get('status') || 'active';
  const search = searchParams.get('search');

  const deviceId = request.headers.get('x-device-id');

  const result = await pool.query(`
    SELECT
      id,
      title,
      skill_id,
      message_count,
      LEFT(messages->-1->>'content', 100) as last_message_preview,
      created_at,
      updated_at
    FROM chat_sessions
    WHERE status = $1
    AND deleted_at IS NULL
    AND device_id = $2
    ${skillId ? 'AND skill_id = $3' : ''}
    ${search ? `AND (title ILIKE $${skillId ? 4 : 3} OR messages::text ILIKE $${skillId ? 4 : 3})` : ''}
    ORDER BY updated_at DESC
    LIMIT $${skillId && search ? 5 : skillId || search ? 4 : 3}
    OFFSET $${skillId && search ? 6 : skillId || search ? 5 : 4}
  `, [
    status,
    deviceId,
    ...(skillId ? [skillId] : []),
    ...(search ? [`%${search}%`] : []),
    limit,
    offset,
  ]);

  // Get total count
  const countResult = await pool.query(`
    SELECT COUNT(*) as total
    FROM chat_sessions
    WHERE status = $1 AND deleted_at IS NULL AND device_id = $2
  `, [status, deviceId]);

  return NextResponse.json({
    sessions: result.rows.map(row => ({
      id: row.id,
      title: row.title,
      skillId: row.skill_id,
      messageCount: row.message_count,
      lastMessagePreview: row.last_message_preview,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    pagination: {
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      hasMore: offset + limit < parseInt(countResult.rows[0].total),
    },
  });
}
```

### 3.2 POST /api/sessions

Create a new session.

**Request:**

```typescript
interface CreateSessionRequest {
  title?: string;
  skillId?: string;
  metadata?: Record<string, any>;
}
```

**Response:**

```typescript
interface SessionResponse {
  id: string;
  title: string;
  skillId?: string;
  messages: Message[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### 3.3 GET /api/sessions/[id]

Get a specific session with full message history.

**Response:**

```typescript
interface SessionDetailResponse {
  id: string;
  title: string;
  skillId?: string;
  messages: Message[];
  metadata: Record<string, any>;
  stats: {
    messageCount: number;
    tokenCount: number;
    duration: number;  // seconds from first to last message
  };
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 PUT /api/sessions/[id]

Update session metadata (title, status, etc.).

**Request:**

```typescript
interface UpdateSessionRequest {
  title?: string;
  status?: 'active' | 'archived';
  metadata?: Record<string, any>;
}
```

### 3.5 DELETE /api/sessions/[id]

Soft-delete a session.

**Response:**

```typescript
interface DeleteSessionResponse {
  success: boolean;
  id: string;
}
```

---

## 4. Skills API

### 4.1 GET /api/skills

List all available skills.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by category |
| `enabled` | boolean | true | Include disabled skills |

**Response:**

```typescript
interface SkillsListResponse {
  skills: Skill[];
  categories: {
    id: string;
    name: string;
    count: number;
  }[];
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'user' | 'example' | 'backend' | 'essentials';
  icon: string;
  enabled: boolean;
  usageCount?: number;
}
```

**Implementation:**

```typescript
// app/api/skills/route.ts
import { SKILLS } from '@/lib/skills/definitions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const enabled = searchParams.get('enabled') !== 'false';

  let skills = [...SKILLS];

  // Filter by category
  if (category) {
    skills = skills.filter(s => s.category === category);
  }

  // Filter by enabled status
  if (enabled) {
    skills = skills.filter(s => s.enabled !== false);
  }

  // Group by category
  const categories = Object.entries(
    skills.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([id, count]) => ({
    id,
    name: getCategoryName(id),
    count,
  }));

  return NextResponse.json({
    skills,
    categories,
  });
}

function getCategoryName(id: string): string {
  const names: Record<string, string> = {
    user: 'User Skills',
    example: 'Example Skills',
    backend: 'Backend Development',
    essentials: 'Developer Essentials',
  };
  return names[id] || id;
}
```

### 4.2 GET /api/skills/[id]

Get detailed information about a specific skill.

**Response:**

```typescript
interface SkillDetailResponse {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: string;
  icon: string;
  enabled: boolean;

  // Capabilities
  capabilities: string[];
  toolMappings: Record<string, string>;

  // Usage examples
  examples: {
    input: string;
    description: string;
  }[];

  // Stats
  stats?: {
    usageCount: number;
    avgRating: number;
    lastUsed: string;
  };
}
```

### 4.3 POST /api/skills/execute

Execute a skill with given input.

**Request:**

```typescript
interface SkillExecuteRequest {
  skillId: string;
  message: string;
  sessionId?: string;
  context?: {
    files?: string[];
    workspace?: string;
    preferences?: Record<string, any>;
  };
  stream?: boolean;
}
```

**Response:**

```typescript
interface SkillExecuteResponse {
  sessionId: string;
  skillId: string;
  content: string;

  // Skill-specific outputs
  artifacts?: Artifact[];
  suggestions?: string[];
  warnings?: string[];

  // Next steps
  followUp?: {
    questions: string[];
    actions: {
      label: string;
      action: string;
      params?: Record<string, any>;
    }[];
  };
}
```

**Implementation:**

```typescript
// app/api/skills/execute/route.ts
export async function POST(request: NextRequest) {
  const body: SkillExecuteRequest = await request.json();
  const { skillId, message, sessionId, context, stream } = body;

  // Validate skill exists
  const skill = SKILLS.find(s => s.id === skillId);
  if (!skill) {
    return NextResponse.json(
      { error: 'Skill not found', code: 'SKILL_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Build skill-specific system prompt
  const systemPrompt = buildSkillSystemPrompt(skill, context);

  // Get or create session
  let session = sessionId
    ? await getSession(sessionId)
    : await createSession({ skillId });

  // Execute via CLIProxyAPI
  const openai = new OpenAI({
    baseURL: process.env.CLIPROXY_URL,
    apiKey: process.env.CLIPROXY_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929',
    messages: [
      { role: 'system', content: systemPrompt },
      ...session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
    max_tokens: 8192,  // Higher limit for skills
  });

  const assistantContent = completion.choices[0].message.content || '';

  // Parse artifacts from response
  const artifacts = parseArtifacts(assistantContent);

  // Store messages
  await addMessagesToSession(session.id, [
    { role: 'user', content: message, skillId },
    { role: 'assistant', content: assistantContent, skillId, artifacts },
  ]);

  // Generate follow-up suggestions
  const followUp = generateFollowUp(skill, assistantContent);

  return NextResponse.json({
    sessionId: session.id,
    skillId,
    content: assistantContent,
    artifacts,
    followUp,
  });
}

function buildSkillSystemPrompt(skill: Skill, context?: any): string {
  let prompt = `You are executing the "${skill.name}" skill.

${skill.systemPrompt || skill.description}

## Tool Mapping Instructions
Since you are being called via API, use API-compatible tools instead of MCP tools:
- Use "WebSearch" instead of "mcp__tavily__tavily-search"
- Use "WebFetch" instead of "mcp__tavily__tavily-extract"
- Use native tools (Read, Write, Edit, Bash, Grep, Glob) directly

## Output Format
When generating files or code, use clear markers:
\`\`\`filename.ext
content here
\`\`\`

`;

  if (context?.files) {
    prompt += `\n## Relevant Files\n${context.files.join('\n')}\n`;
  }

  if (context?.workspace) {
    prompt += `\n## Workspace\n${context.workspace}\n`;
  }

  return prompt;
}

function parseArtifacts(content: string): Artifact[] {
  const artifacts: Artifact[] = [];

  // Parse code blocks with filenames
  const codeBlockRegex = /```(\S+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const filename = match[1];
    const code = match[2];

    // Check if it looks like a filename (has extension)
    if (filename.includes('.')) {
      artifacts.push({
        type: 'code',
        name: filename,
        content: code,
        mimeType: getMimeType(filename),
      });
    }
  }

  return artifacts;
}
```

---

## 5. Files API (Optional)

### 5.1 GET /api/files

List files in workspace.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | / | Directory path |
| `recursive` | boolean | false | Include subdirectories |

**Response:**

```typescript
interface FilesListResponse {
  path: string;
  files: FileEntry[];
  directories: DirectoryEntry[];
}

interface FileEntry {
  name: string;
  path: string;
  size: number;
  mimeType: string;
  modifiedAt: string;
}

interface DirectoryEntry {
  name: string;
  path: string;
  fileCount: number;
}
```

### 5.2 GET /api/files/[...path]

Read file content.

**Response:**

```typescript
interface FileReadResponse {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  mimeType: string;
  size: number;
  modifiedAt: string;
}
```

### 5.3 PUT /api/files/[...path]

Write file content.

**Request:**

```typescript
interface FileWriteRequest {
  content: string;
  encoding?: 'utf-8' | 'base64';
  createDirectories?: boolean;
}
```

**Response:**

```typescript
interface FileWriteResponse {
  path: string;
  size: number;
  modifiedAt: string;
}
```

---

## 6. Error Handling

### 6.1 Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    retryable?: boolean;
    retryAfter?: number;  // seconds
  };
}
```

### 6.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `CLIPROXY_ERROR` | 502 | CLIProxyAPI error |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SKILL_NOT_FOUND` | 404 | Skill ID not found |
| `SESSION_NOT_FOUND` | 404 | Session ID not found |
| `STREAM_ERROR` | 500 | Streaming error |

### 6.3 Error Handler

```typescript
// lib/api/errors.ts
export class APIError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'APIError';
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          details: this.details,
          retryable: this.retryable,
        },
      },
      { status: this.statusCode }
    );
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return error.toResponse();
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('rate limit')) {
      return new APIError(
        'RATE_LIMITED',
        429,
        'Too many requests. Please try again later.',
        undefined,
        true
      ).toResponse();
    }

    if (error.message.includes('ECONNREFUSED')) {
      return new APIError(
        'CLIPROXY_ERROR',
        502,
        'Unable to connect to Claude Code. Please try again.',
        undefined,
        true
      ).toResponse();
    }
  }

  return new APIError(
    'INTERNAL_ERROR',
    500,
    'An unexpected error occurred.',
  ).toResponse();
}
```

---

## 7. Rate Limiting

### 7.1 Rate Limit Configuration

```typescript
// lib/api/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const ratelimit = {
  // Chat: 20 requests per minute
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'ratelimit:chat',
  }),

  // Skills: 10 requests per minute
  skills: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:skills',
  }),

  // Sessions: 60 requests per minute
  sessions: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'ratelimit:sessions',
  }),
};
```

### 7.2 Rate Limit Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ratelimit } from '@/lib/api/rateLimit';

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const path = request.nextUrl.pathname;

  // Determine rate limit based on path
  let limiter;
  if (path.startsWith('/api/chat')) {
    limiter = ratelimit.chat;
  } else if (path.startsWith('/api/skills')) {
    limiter = ratelimit.skills;
  } else if (path.startsWith('/api/sessions')) {
    limiter = ratelimit.sessions;
  } else {
    return NextResponse.next();
  }

  const { success, limit, reset, remaining } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          retryable: true,
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## 8. Request Validation

### 8.1 Zod Schemas

```typescript
// lib/api/validation.ts
import { z } from 'zod';

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(100000),
  sessionId: z.string().uuid().optional(),
  skillId: z.string().max(100).optional(),
  stream: z.boolean().optional().default(false),
  context: z.object({
    files: z.array(z.string()).optional(),
    products: z.array(z.string()).optional(),
    instructions: z.string().max(10000).optional(),
  }).optional(),
});

export const createSessionSchema = z.object({
  title: z.string().max(200).optional(),
  skillId: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

export const skillExecuteSchema = z.object({
  skillId: z.string().min(1).max(100),
  message: z.string().min(1).max(100000),
  sessionId: z.string().uuid().optional(),
  context: z.record(z.any()).optional(),
  stream: z.boolean().optional().default(false),
});

// Validation helper
export function validate<T>(schema: z.Schema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new APIError(
      'VALIDATION_ERROR',
      400,
      'Invalid request parameters',
      { errors: result.error.flatten().fieldErrors }
    );
  }
  return result.data;
}
```

---

## 9. API Client (Frontend)

### 9.1 Base Client

```typescript
// lib/api/client.ts
const API_BASE = '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, signal } = options;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': getDeviceId(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
  }

  return response.json();
}

// Streaming helper
export async function* streamRequest(
  endpoint: string,
  body: any,
  signal?: AbortSignal
): AsyncGenerator<any> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': getDeviceId(),
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
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
        const data = JSON.parse(line.slice(6));
        yield data;
      }
    }
  }
}
```

### 9.2 API Functions

```typescript
// lib/api/chat.ts
export const chatApi = {
  send: (request: ChatRequest) =>
    apiRequest<ChatResponse>('/chat', {
      method: 'POST',
      body: request,
    }),

  stream: (request: ChatRequest) =>
    streamRequest('/chat', request),
};

// lib/api/sessions.ts
export const sessionsApi = {
  list: (params?: { limit?: number; offset?: number; skillId?: string }) =>
    apiRequest<SessionsListResponse>(`/sessions?${new URLSearchParams(params as any)}`),

  get: (id: string) =>
    apiRequest<SessionDetailResponse>(`/sessions/${id}`),

  create: (request: CreateSessionRequest) =>
    apiRequest<SessionResponse>('/sessions', {
      method: 'POST',
      body: request,
    }),

  update: (id: string, request: UpdateSessionRequest) =>
    apiRequest<SessionResponse>(`/sessions/${id}`, {
      method: 'PUT',
      body: request,
    }),

  delete: (id: string) =>
    apiRequest<DeleteSessionResponse>(`/sessions/${id}`, {
      method: 'DELETE',
    }),
};

// lib/api/skills.ts
export const skillsApi = {
  list: (params?: { category?: string }) =>
    apiRequest<SkillsListResponse>(`/skills?${new URLSearchParams(params as any)}`),

  get: (id: string) =>
    apiRequest<SkillDetailResponse>(`/skills/${id}`),

  execute: (request: SkillExecuteRequest) =>
    apiRequest<SkillExecuteResponse>('/skills/execute', {
      method: 'POST',
      body: request,
    }),

  executeStream: (request: SkillExecuteRequest) =>
    streamRequest('/skills/execute', request),
};
```

---

## 10. OpenAPI Specification

```yaml
# openapi.yaml
openapi: 3.0.3
info:
  title: Claude Chat UI API
  version: 1.0.0
  description: API for Claude Chat UI with Skills and Session management

servers:
  - url: http://localhost:3000/api
    description: Development server

paths:
  /chat:
    post:
      summary: Send chat message
      operationId: sendMessage
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChatRequest'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatResponse'
        '429':
          $ref: '#/components/responses/RateLimited'

  /sessions:
    get:
      summary: List sessions
      operationId: listSessions
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Session list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionsListResponse'

  /skills:
    get:
      summary: List skills
      operationId: listSkills
      responses:
        '200':
          description: Skills list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SkillsListResponse'

components:
  schemas:
    ChatRequest:
      type: object
      required:
        - message
      properties:
        message:
          type: string
        sessionId:
          type: string
          format: uuid
        skillId:
          type: string
        stream:
          type: boolean

    ChatResponse:
      type: object
      properties:
        sessionId:
          type: string
        messageId:
          type: string
        content:
          type: string

  responses:
    RateLimited:
      description: Rate limit exceeded
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: RATE_LIMITED
                  message:
                    type: string
```
