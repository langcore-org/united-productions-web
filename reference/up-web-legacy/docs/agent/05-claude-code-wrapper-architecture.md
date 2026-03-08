# Claude Code OpenAI Wrapper Architecture

## Overview

Claude Code OpenAI Wrapperは、Claude Agent SDK（公式Python SDK）を使用して、Claude CodeのフルツールセットをOpenAI互換APIとして公開します。

### CLIProxyAPI vs Claude Code OpenAI Wrapper

| 項目 | CLIProxyAPI | Claude Code OpenAI Wrapper |
|------|-------------|---------------------------|
| 言語 | Go | Python |
| バックエンド | Anthropic Messages API直接 | Claude Agent SDK |
| ツール対応 | ❌ なし | ✅ フル対応 |
| WebSearch | ❌ 不可 | ✅ 可能 |
| ファイル操作 | ❌ 不可 | ✅ 可能 |
| Bash実行 | ❌ 不可 | ✅ 可能 |
| セッション継続 | ❌ 不可 | ✅ 可能 |
| ポート | 8317 | 8000 |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Chat UI                               │
│                    (next-chat-ui-cc-wrapper)                     │
├─────────────────────────────────────────────────────────────────┤
│  Framework: Next.js 14+ (App Router)                            │
│  UI: Vercel AI SDK (useChat) + Tailwind CSS                     │
│                                                                  │
│  Storage:                                                        │
│  ├── Sessions: SQLite (better-sqlite3)                          │
│  ├── Mode/SystemPrompt: SQLite per session                      │
│  └── Files: LocalStorage (browser)                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/SSE (Port 3007)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Claude Code OpenAI Wrapper                      │
│                    (Port 8000)                                   │
├─────────────────────────────────────────────────────────────────┤
│  Framework: FastAPI + Uvicorn                                    │
│  SDK: Claude Agent SDK (claude-agent-sdk v0.1.6+)               │
│                                                                  │
│  OpenAI Compatible API:                                          │
│  ├── POST /v1/chat/completions (streaming/non-streaming)        │
│  ├── GET  /v1/models                                            │
│  ├── GET  /health                                                │
│  └── GET  /v1/auth/status                                        │
│                                                                  │
│  Claude Code Tools (via SDK):                                    │
│  ├── Read, Write, Edit, Glob, Grep (File ops)                  │
│  ├── Bash, BashOutput, KillShell (System)                       │
│  ├── WebSearch, WebFetch (Web)                                  │
│  ├── TodoWrite (Productivity)                                   │
│  ├── Task (Sub-agents)                                          │
│  └── Skill, SlashCommand (Extensions)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Claude Agent SDK
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                               │
│                    (@anthropic-ai/claude-code)                   │
├─────────────────────────────────────────────────────────────────┤
│  Authentication:                                                 │
│  ├── OAuth (claude auth login) - Claude Max/Pro subscription    │
│  ├── API Key (ANTHROPIC_API_KEY) - Pay-per-use                  │
│  ├── AWS Bedrock                                                │
│  └── Google Vertex AI                                           │
│                                                                  │
│  Tool Execution:                                                 │
│  ├── Local file system access                                   │
│  ├── Shell command execution                                    │
│  └── Web search and fetch                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Input (Web UI)
    │
    ▼
┌─────────────────┐
│  useChat Hook   │  Vercel AI SDK (@ai-sdk/react)
│  (React)        │
└────────┬────────┘
         │ POST /api/chat
         │ Body: { messages, sessionId, mode, systemPrompt }
         ▼
┌─────────────────┐
│  API Route      │  Next.js API Route
│  route.ts       │
└────────┬────────┘
         │ 1. Get/Create session in SQLite
         │ 2. Apply mode's system prompt
         │ 3. Forward to wrapper
         ▼
┌─────────────────┐
│  Wrapper API    │  POST /v1/chat/completions
│  (FastAPI)      │  enable_tools: true
└────────┬────────┘  permission_mode: bypassPermissions
         │
         │ Claude Agent SDK
         ▼
┌─────────────────┐
│  Claude Code    │  Tool execution
│  (SDK)          │  - WebSearch
└────────┬────────┘  - Read/Write files
         │           - Bash commands
         ▼
    Streaming Response (SSE)
         │
         ▼
    User sees response
```

## Key Components

### 1. Chat UI (next-chat-ui-cc-wrapper)

**Purpose**: Web interface for chatting with Claude Code

**Key Files**:
- `src/app/api/chat/route.ts` - API route connecting to wrapper
- `src/lib/modes.ts` - Agent mode definitions with system prompts
- `src/lib/db.ts` - SQLite session/message storage
- `src/components/chat/Chat.tsx` - Main chat component
- `src/components/modes/ModeSelector.tsx` - Mode selection UI

### 2. Wrapper (claude-code-openai-wrapper)

**Purpose**: OpenAI-compatible API exposing Claude Code capabilities

**Key Files**:
- `src/main.py` - FastAPI application with endpoints
- `src/claude_cli.py` - Claude Agent SDK integration
- `src/constants.py` - Tool configuration (allowed/disallowed)
- `src/tool_manager.py` - Per-session tool management
- `src/auth.py` - Authentication handling

### 3. Configuration Flow

```yaml
.env.local (Chat UI):
  CLIPROXY_URL: http://localhost:8000/v1
  CLIPROXY_API_KEY: not-needed
  DEFAULT_MODEL: claude-sonnet-4-5-20250929
  ENABLE_TOOLS: true

constants.py (Wrapper):
  DEFAULT_ALLOWED_TOOLS:
    - Read, Write, Edit, Glob, Grep, Bash
    - WebFetch, WebSearch, TodoWrite, Task
  DEFAULT_DISALLOWED_TOOLS: []

claude_cli.py (Wrapper):
  permission_mode: bypassPermissions  # Skip permission prompts
  max_turns: 50  # Allow multiple tool calls
```
