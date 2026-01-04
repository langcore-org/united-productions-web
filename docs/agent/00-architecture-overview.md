# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Chat UI                               │
│                    (next-chat-ui)                                │
├─────────────────────────────────────────────────────────────────┤
│  Framework: Next.js 14+ (App Router)                            │
│  UI: Vercel AI SDK (useChat) + Tailwind CSS                     │
│  Auth: NextAuth.js (後で追加)                                    │
│                                                                   │
│  Storage:                                                        │
│  ├── Sessions: SQLite (better-sqlite3)                          │
│  └── Files: LocalStorage (ブラウザ)                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/SSE
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIProxyAPI                                   │
│                    (Port 8317)                                   │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI互換API:                                                  │
│  ├── POST /v1/chat/completions                                  │
│  └── GET  /v1/models                                            │
│                                                                   │
│  Claude Code Runtime:                                            │
│  ├── ファイル操作 (Read/Write/Edit)                              │
│  ├── コマンド実行 (Bash)                                         │
│  ├── Web検索 (WebSearch/WebFetch)                               │
│  └── Skills実行                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Input
    │
    ▼
┌─────────────┐
│  useChat    │  Vercel AI SDK
│  (React)    │
└──────┬──────┘
       │ POST /api/chat
       ▼
┌─────────────┐
│  API Route  │  Next.js
│  (Node.js)  │
└──────┬──────┘
       │ 1. SQLiteにセッション保存
       │ 2. CLIProxyAPIにリクエスト
       ▼
┌─────────────┐
│ CLIProxyAPI │  OpenAI互換
│             │
└──────┬──────┘
       │ Claude Code実行
       ▼
┌─────────────┐
│ Claude Code │  ツール実行
│             │  ファイル操作
└─────────────┘
       │
       ▼ ストリーミングレスポンス
    User
```

## Storage Strategy

### Phase 1 (Current)

| データ | 保存先 | 理由 |
|--------|--------|------|
| チャットセッション | SQLite | サーバーサイドで永続化、シンプル |
| ファイル参照 | LocalStorage | クライアントサイドで十分 |
| 認証 | Session Cookie | NextAuth.js |

### Phase 2 (Future - Production)

| データ | 保存先 | 理由 |
|--------|--------|------|
| チャットセッション | PostgreSQL (Supabase) | スケーラビリティ |
| ファイル | Object Storage (Supabase) | 永続化・共有 |
| 認証 | Supabase Auth | 統合認証 |

## Tech Stack

```yaml
Frontend:
  - Next.js 14+ (App Router)
  - React 18+
  - Tailwind CSS
  - Vercel AI SDK (@ai-sdk/react)

Backend:
  - Next.js API Routes
  - better-sqlite3 (セッション保存)
  - @ai-sdk/openai (CLIProxyAPI接続)

External:
  - CLIProxyAPI (Port 8317)
  - Claude Code (via CLIProxyAPI)
```

## Directory Structure

```
next-chat-ui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # メインチャットUI
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts      # Chat API (CLIProxyAPI連携)
│   │   └── sessions/
│   │       ├── route.ts      # Sessions CRUD
│   │       └── [id]/route.ts
│   └── sessions/
│       └── page.tsx          # セッション履歴
│
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   └── ChatInput.tsx
│   └── sessions/
│       └── SessionList.tsx
│
├── lib/
│   ├── db.ts                 # SQLite クライアント
│   ├── ai.ts                 # AI SDK設定
│   └── types.ts              # 型定義
│
├── data/
│   └── chat.db               # SQLiteデータベース
│
└── .env.local                # 環境変数
```
