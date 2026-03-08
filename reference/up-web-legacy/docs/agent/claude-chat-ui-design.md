# Claude Chat UI 設計書

## Overview

Claude Chat UIを改造し、CLIProxyAPI経由でセッション管理とファイル管理をデータベース化したChatbot Agentを構築する。Claude Skillsを選択・実行できる機能を持つ。

---

## 1. システムアーキテクチャ

### 1.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                            │
│                      (Port 3000)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Pages:                                                          │
│  ├── /              → Chat UI (メイン画面)                       │
│  ├── /sessions      → セッション履歴一覧                         │
│  ├── /sessions/[id] → 過去セッション表示                         │
│  └── /files         → ファイルブラウザ (Optional)                │
│                                                                  │
│  Components:                                                     │
│  ├── ChatContainer   → メッセージ表示・入力                       │
│  ├── SkillSelector   → Skills選択UI                              │
│  ├── SessionList     → セッション一覧                            │
│  └── FileExplorer    → ファイル閲覧・編集                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                             │
│                   (Backend Logic)                                │
├─────────────────────────────────────────────────────────────────┤
│  Chat & Skills:                                                  │
│  ├── POST /api/chat           → メッセージ送信・応答              │
│  ├── GET  /api/skills         → Skills一覧取得                   │
│  └── POST /api/skills/execute → Skill実行                        │
│                                                                  │
│  Sessions (CLIProxyAPI経由):                                     │
│  ├── GET    /api/sessions         → セッション一覧               │
│  ├── POST   /api/sessions         → 新規セッション作成            │
│  ├── GET    /api/sessions/[id]    → セッション取得               │
│  ├── PUT    /api/sessions/[id]    → セッション更新               │
│  └── DELETE /api/sessions/[id]    → セッション削除               │
│                                                                  │
│  Files (CLIProxyAPI経由):                                        │
│  ├── GET    /api/files            → ファイル一覧                 │
│  ├── GET    /api/files/[path]     → ファイル読み込み             │
│  └── PUT    /api/files/[path]     → ファイル書き込み             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLIProxyAPI                                  │
│                     (Port 8317)                                  │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI互換エンドポイント:                                        │
│  ├── POST /v1/chat/completions  → Chat Completions               │
│  ├── GET  /v1/models            → 利用可能モデル                  │
│  └── WS   /v1/ws                → ストリーミング                  │
│                                                                  │
│  Storage Backend:                                                │
│  ├── PostgresStore    → セッション・設定をDBに保存               │
│  └── ObjectStore      → ファイルをS3/Supabase Storageに保存      │
│                                                                  │
│  管理API:                                                        │
│  └── /v0/management   → 設定・認証管理                           │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────────┐
│   PostgreSQL     │          │   Object Storage     │
│   (Supabase)     │          │   (Supabase Storage) │
├──────────────────┤          ├──────────────────────┤
│ Tables:          │          │ Buckets:             │
│ ├── config_store │          │ ├── cliproxy-config  │
│ ├── auth_store   │          │ ├── cliproxy-auth    │
│ └── chat_sessions│          │ └── workspace-files  │
└──────────────────┘          └──────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Claude Code Runtime                          │
│                      (via CLIProxyAPI)                            │
├──────────────────────────────────────────────────────────────────┤
│  Claude Skills:                                                   │
│  ├── User Skills       (slidev-creator, neta-research, ...)      │
│  ├── Example Skills    (skill-creator, mcp-builder, ...)         │
│  ├── Backend Skills    (api-design, architecture-patterns, ...)  │
│  └── Essentials Skills (auth-implementation, debugging, ...)     │
│                                                                   │
│  MCP Servers:                                                     │
│  ├── Sequential Thinking → 複雑な推論                             │
│  ├── Tavily Search       → Web検索                                │
│  └── Serena              → シンボル操作・メモリ                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 データフロー

```
[User] → [Next.js UI] → [Next.js API] → [CLIProxyAPI] → [Claude Code]
                              │                │
                              │                └→ [PostgreSQL] (Sessions)
                              │                └→ [Object Storage] (Files)
                              │
                              └→ [Response] → [UI Update]
```

---

## 2. データベース設計

### 2.1 CLIProxyAPI Storage Tables (PostgreSQL)

```sql
-- CLIProxyAPIが自動作成するテーブル
CREATE TABLE config_store (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_store (
    id TEXT PRIMARY KEY,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 アプリケーション固有テーブル

```sql
-- チャットセッション
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,                           -- 認証ユーザーID (Optional)
    title TEXT,                             -- セッションタイトル
    skill_id TEXT,                          -- 使用したSkill ID (nullable)
    messages JSONB NOT NULL DEFAULT '[]',   -- メッセージ履歴
    metadata JSONB NOT NULL DEFAULT '{}',   -- 追加メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_sessions_skill ON chat_sessions(skill_id);
CREATE INDEX idx_sessions_updated ON chat_sessions(updated_at DESC);

-- セッションメッセージ構造
-- messages JSONB example:
-- [
--   {
--     "id": "msg_001",
--     "role": "user",
--     "content": "プレゼン資料を作成して",
--     "skill_id": "slidev-creator",
--     "created_at": "2025-12-06T10:00:00Z"
--   },
--   {
--     "id": "msg_002",
--     "role": "assistant",
--     "content": "スライドを作成しました。",
--     "tool_calls": [...],
--     "created_at": "2025-12-06T10:00:05Z"
--   }
-- ]
```

### 2.3 Skills定義テーブル (Optional - Dynamic Skills)

```sql
-- カスタムSkills定義 (DBから動的にロードする場合)
CREATE TABLE custom_skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    system_prompt TEXT,                    -- スキル固有のシステムプロンプト
    tool_mappings JSONB DEFAULT '{}',      -- MCPツール→APIツール変換マッピング
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- デフォルトSkillsはコード内で定義、DBは拡張用
```

---

## 3. API設計

### 3.1 Chat API

#### POST /api/chat

**リクエスト:**
```typescript
interface ChatRequest {
  sessionId?: string;         // 既存セッションに追加
  message: string;            // ユーザーメッセージ
  skillId?: string;           // 使用するSkill ID
  stream?: boolean;           // ストリーミング有効化
}
```

**レスポンス:**
```typescript
interface ChatResponse {
  sessionId: string;          // セッションID
  messageId: string;          // メッセージID
  content: string;            // アシスタント応答
  skillId?: string;           // 使用したSkill
  toolCalls?: ToolCall[];     // 実行したツール
  products?: Product[];       // 参照された商品 (catalog連携)
  plans?: Plan[];             // 参照されたプラン
}
```

**実装:**
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { sessionId, message, skillId, stream } = await req.json();

  // 1. セッション取得または作成 (CLIProxyAPI PostgresStore経由)
  let session = sessionId
    ? await getSession(sessionId)
    : await createSession();

  // 2. Skill用システムプロンプト構築
  const systemPrompt = skillId
    ? buildSkillPrompt(skillId)
    : buildDefaultPrompt();

  // 3. CLIProxyAPI経由でClaude Code呼び出し
  const openai = new OpenAI({
    baseURL: process.env.CLIPROXY_URL || 'http://localhost:8317/v1',
    apiKey: process.env.CLIPROXY_API_KEY || 'sk-default',
  });

  const completion = await openai.chat.completions.create({
    model: 'claude-sonnet-4-5-20250929',
    messages: [
      { role: 'system', content: systemPrompt },
      ...session.messages,
      { role: 'user', content: message },
    ],
    stream: stream,
  });

  // 4. セッション更新
  await updateSession(session.id, [
    { role: 'user', content: message },
    { role: 'assistant', content: completion.choices[0].message.content },
  ]);

  return Response.json({ ... });
}
```

### 3.2 Skills API

#### GET /api/skills

**レスポンス:**
```typescript
interface SkillsResponse {
  skills: Skill[];
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'user' | 'example' | 'backend' | 'essentials';
  enabled: boolean;
  icon?: string;
  systemPromptTemplate?: string;
}
```

**Skills一覧:**
```typescript
const SKILLS = [
  // User Skills
  { id: 'slidev-creator', name: 'Slidev Creator', category: 'user', ... },
  { id: 'google-adk-expert', name: 'Google ADK Expert', category: 'user', ... },
  { id: 'claude-agent-sdk-professional', name: 'Claude Agent SDK Pro', category: 'user', ... },
  { id: 'neta-research', name: 'Neta Research', category: 'user', ... },

  // Example Skills (from Anthropic)
  { id: 'example-skills:skill-creator', name: 'Skill Creator', category: 'example', ... },
  { id: 'example-skills:mcp-builder', name: 'MCP Builder', category: 'example', ... },
  { id: 'example-skills:canvas-design', name: 'Canvas Design', category: 'example', ... },
  { id: 'example-skills:algorithmic-art', name: 'Algorithmic Art', category: 'example', ... },

  // Backend Development Skills
  { id: 'backend-development:api-design-principles', name: 'API Design', category: 'backend', ... },
  { id: 'backend-development:architecture-patterns', name: 'Architecture Patterns', category: 'backend', ... },
  { id: 'backend-development:microservices-patterns', name: 'Microservices', category: 'backend', ... },

  // Developer Essentials
  { id: 'developer-essentials:auth-implementation-patterns', name: 'Auth Implementation', category: 'essentials', ... },
  { id: 'developer-essentials:error-handling-patterns', name: 'Error Handling', category: 'essentials', ... },
  { id: 'developer-essentials:debugging-strategies', name: 'Debugging', category: 'essentials', ... },
  { id: 'developer-essentials:e2e-testing-patterns', name: 'E2E Testing', category: 'essentials', ... },
];
```

#### POST /api/skills/execute

**リクエスト:**
```typescript
interface SkillExecuteRequest {
  skillId: string;
  userMessage: string;
  sessionId?: string;
  context?: Record<string, any>;  // スキル固有のコンテキスト
}
```

**レスポンス:**
```typescript
interface SkillExecuteResponse {
  sessionId: string;
  skillId: string;
  content: string;
  artifacts?: Artifact[];  // 生成されたファイル等
  toolResults?: ToolResult[];
}

interface Artifact {
  type: 'file' | 'code' | 'image' | 'presentation';
  name: string;
  content: string;
  path?: string;
}
```

### 3.3 Sessions API

#### GET /api/sessions

**クエリパラメータ:**
- `userId`: ユーザーでフィルタ
- `skillId`: Skillでフィルタ
- `limit`: 取得件数 (default: 20)
- `offset`: オフセット

**レスポンス:**
```typescript
interface SessionsResponse {
  sessions: SessionSummary[];
  total: number;
  hasMore: boolean;
}

interface SessionSummary {
  id: string;
  title: string;
  skillId?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}
```

#### GET /api/sessions/[id]

**レスポンス:**
```typescript
interface SessionDetailResponse {
  id: string;
  title: string;
  skillId?: string;
  messages: Message[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  skillId?: string;
  toolCalls?: ToolCall[];
  createdAt: string;
}
```

### 3.4 Files API (Optional)

#### GET /api/files

ワークスペース内のファイル一覧を取得。

#### GET /api/files/[...path]

ファイル内容を取得。

#### PUT /api/files/[...path]

ファイルを作成・更新。

---

## 4. Skills統合設計

### 4.1 Skill実行フロー

```
[User] → "スライド作成して" + [slidev-creator選択]
         ↓
[Next.js API]
  ├── 1. Skill定義を取得
  ├── 2. システムプロンプトを構築
  │      └── Skill固有の指示 + ツール変換ルール
  ├── 3. CLIProxyAPI経由でリクエスト
  └── 4. レスポンス処理
         ├── テキスト応答を抽出
         ├── 生成ファイルを保存 (Object Storage)
         └── セッションに記録 (PostgreSQL)
         ↓
[User] ← 応答 + ダウンロードリンク
```

### 4.2 Skill→APIツール変換マッピング

Claude CodeはMCPツールを使用するが、API経由ではネイティブツールに変換:

```typescript
const TOOL_MAPPINGS: Record<string, string> = {
  // MCP Search
  'mcp__tavily__tavily-search': 'WebSearch',
  'mcp__tavily__tavily-extract': 'WebFetch',

  // MCP Reasoning
  'mcp__sequential-thinking__sequentialthinking': 'native_reasoning',

  // MCP Memory
  'mcp__serena__write_memory': 'session_metadata',
  'mcp__serena__read_memory': 'session_metadata',

  // Native tools work as-is
  'Read': 'Read',
  'Write': 'Write',
  'Edit': 'Edit',
  'Bash': 'Bash',
  'Grep': 'Grep',
  'Glob': 'Glob',
};
```

### 4.3 Skillシステムプロンプトテンプレート

```typescript
function buildSkillPrompt(skillId: string): string {
  const skill = SKILLS.find(s => s.id === skillId);
  if (!skill) return buildDefaultPrompt();

  return `You are executing the "${skill.name}" skill.

${skill.systemPromptTemplate || skill.description}

IMPORTANT: Since you are being called via API, use the following tools instead of MCP tools:
- Use "WebSearch" instead of "mcp__tavily__tavily-search"
- Use "WebFetch" instead of "mcp__tavily__tavily-extract"
- Use native thinking instead of "mcp__sequential-thinking__sequentialthinking"
- Store session data instead of using "mcp__serena__write_memory"

Please proceed with the skill execution using these API-compatible tools.`;
}
```

---

## 5. フロントエンド設計

### 5.1 コンポーネント構成

```
src/
├── app/
│   ├── page.tsx                    # メインチャット画面
│   ├── layout.tsx                  # 共通レイアウト
│   ├── sessions/
│   │   ├── page.tsx               # セッション一覧
│   │   └── [id]/page.tsx          # セッション詳細
│   └── api/
│       ├── chat/route.ts
│       ├── skills/
│       │   ├── route.ts           # GET skills list
│       │   └── execute/route.ts   # POST skill execution
│       └── sessions/
│           ├── route.ts           # GET/POST sessions
│           └── [id]/route.ts      # GET/PUT/DELETE session
│
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx      # メッセージ表示エリア
│   │   ├── MessageBubble.tsx      # 個別メッセージ
│   │   ├── ChatInput.tsx          # 入力フォーム
│   │   └── StreamingIndicator.tsx # タイピングインジケーター
│   ├── skills/
│   │   ├── SkillSelector.tsx      # Skills選択パネル
│   │   ├── SkillCard.tsx          # 個別Skill表示
│   │   └── SkillBadge.tsx         # 選択中Skill表示
│   ├── sessions/
│   │   ├── SessionList.tsx        # セッション一覧
│   │   ├── SessionItem.tsx        # 個別セッション
│   │   └── NewSessionButton.tsx   # 新規作成ボタン
│   └── shared/
│       ├── ProductCard.tsx        # 商品カード (既存)
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts              # API クライアント
│   │   ├── chat.ts                # チャットAPI
│   │   ├── skills.ts              # Skills API
│   │   └── sessions.ts            # Sessions API
│   ├── store/
│   │   ├── chatStore.ts           # Zustand/Jotai 状態管理
│   │   └── sessionStore.ts
│   ├── types/
│   │   ├── chat.ts                # チャット型定義
│   │   ├── skill.ts               # Skills型定義
│   │   ├── session.ts             # セッション型定義
│   │   └── catalog.ts             # 既存カタログ型
│   └── utils/
│       ├── formatters.ts          # フォーマッター
│       └── validators.ts          # バリデーション
│
└── styles/
    └── globals.css                # Tailwind CSS
```

### 5.2 主要コンポーネント設計

#### SkillSelector.tsx

```tsx
interface SkillSelectorProps {
  skills: Skill[];
  selectedSkill: string | null;
  onSelect: (skillId: string | null) => void;
  compact?: boolean;  // サイドバー表示 or インライン表示
}

export function SkillSelector({ skills, selectedSkill, onSelect, compact }: SkillSelectorProps) {
  const groupedSkills = useMemo(() =>
    groupBy(skills, 'category'),
    [skills]
  );

  return (
    <div className={compact ? 'skill-selector-compact' : 'skill-selector-full'}>
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <div key={category} className="skill-category">
          <h3 className="category-title">{categoryLabels[category]}</h3>
          <div className="skill-list">
            {categorySkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                selected={selectedSkill === skill.id}
                onSelect={() => onSelect(skill.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### ChatContainer.tsx

```tsx
interface ChatContainerProps {
  sessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  selectedSkill: Skill | null;
  onSendMessage: (content: string) => Promise<void>;
}

export function ChatContainer({
  sessionId,
  messages,
  isLoading,
  selectedSkill,
  onSendMessage,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      {/* Skill Badge */}
      {selectedSkill && (
        <SkillBadge skill={selectedSkill} />
      )}

      {/* Messages */}
      <div className="messages-area">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            showSkillBadge={!!msg.skillId}
          />
        ))}
        {isLoading && <StreamingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSubmit={onSendMessage}
        disabled={isLoading}
        placeholder={selectedSkill
          ? `${selectedSkill.name}で何をしますか？`
          : 'メッセージを入力...'}
      />
    </div>
  );
}
```

### 5.3 状態管理

```typescript
// lib/store/chatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatState {
  // Current session
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;

  // Skills
  selectedSkillId: string | null;
  availableSkills: Skill[];

  // Actions
  setCurrentSession: (sessionId: string | null) => void;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  selectSkill: (skillId: string | null) => void;
  setSkills: (skills: Skill[]) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      messages: [],
      isLoading: false,
      selectedSkillId: null,
      availableSkills: [],

      setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),

      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
      })),

      setLoading: (isLoading) => set({ isLoading }),

      selectSkill: (skillId) => set({ selectedSkillId: skillId }),

      setSkills: (skills) => set({ availableSkills: skills }),

      resetChat: () => set({
        currentSessionId: null,
        messages: [],
        selectedSkillId: null,
      }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        selectedSkillId: state.selectedSkillId,
      }),
    }
  )
);
```

---

## 6. エラーハンドリング

### 6.1 エラー階層

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, 'API_ERROR', statusCode, statusCode >= 500);
  }
}

export class CLIProxyError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, 'CLIPROXY_ERROR', statusCode, true);
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
```

### 6.2 リトライロジック

```typescript
// lib/api/client.ts
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new APIError(
          `HTTP ${response.status}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AppError && !error.retryable) {
        throw error;
      }

      // Exponential backoff
      await delay(Math.pow(2, attempt) * 1000);
    }
  }

  throw lastError;
}
```

---

## 7. 設定

### 7.1 環境変数

```bash
# .env.local

# CLIProxyAPI
CLIPROXY_URL=http://localhost:8317/v1
CLIPROXY_API_KEY=sk-your-api-key
CLIPROXY_MANAGEMENT_KEY=your-management-key

# PostgreSQL (Optional - if not using CLIProxyAPI storage)
DATABASE_URL=postgres://user:pass@localhost:5432/chatdb

# Supabase (Alternative)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# App Config
NEXT_PUBLIC_APP_NAME=Claude Chat UI
NEXT_PUBLIC_DEFAULT_MODEL=claude-sonnet-4-5-20250929
```

### 7.2 CLIProxyAPI config.yaml

```yaml
# config.yaml

port: 8317

# PostgreSQL Storage (Supabase)
storage:
  type: postgres
  dsn: "postgres://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
  schema: "public"
  config-table: "cliproxy_config"
  auth-table: "cliproxy_auth"
  spool-dir: "/tmp/cliproxy"

# Object Storage (Supabase Storage)
object-storage:
  endpoint: "[PROJECT].supabase.co/storage/v1/s3"
  bucket: "cliproxy-files"
  access-key: "[SUPABASE_ANON_KEY]"
  secret-key: "[SUPABASE_SERVICE_KEY]"
  region: "us-east-1"
  use-ssl: true
  local-root: "/tmp/cliproxy-files"

# Authentication
auth-dir: "~/.cli-proxy-api"
api-keys:
  - "sk-your-api-key"

# Management API
remote-management:
  allow-remote: true
  secret-key: "your-management-key"

# Runtime
debug: false
request-retry: 3
max-retry-interval: 30
```

---

## 8. 実装ロードマップ

### Phase 1: 基盤整備 (Week 1)

- [ ] プロジェクト構造のリファクタリング
- [ ] 型定義の整備 (`types/chat.ts`, `types/skill.ts`, `types/session.ts`)
- [ ] API クライアントの実装 (`lib/api/client.ts`)
- [ ] エラーハンドリング基盤

### Phase 2: Sessions API (Week 2)

- [ ] PostgreSQL接続設定
- [ ] Sessions CRUD API実装
- [ ] セッション一覧UI
- [ ] セッション詳細UI

### Phase 3: Skills統合 (Week 3)

- [ ] Skills定義の拡充
- [ ] Skill実行ロジックの改善
- [ ] SkillSelector コンポーネント
- [ ] Skill実行結果の表示

### Phase 4: Chat改善 (Week 4)

- [ ] ストリーミング対応
- [ ] ツール実行結果の表示
- [ ] 生成ファイルのダウンロード
- [ ] エラー表示の改善

### Phase 5: 仕上げ (Week 5)

- [ ] ファイルブラウザ (Optional)
- [ ] パフォーマンス最適化
- [ ] テスト追加
- [ ] ドキュメント整備

---

## 9. 既存コードからの移行

### 9.1 保持するコード

| ファイル | 理由 |
|---------|------|
| `components/ProductCard.tsx` | カタログ連携で継続使用 |
| `lib/types/catalog.ts` | カタログ型定義 |
| `lib/catalog-loader.ts` | カタログデータ読み込み |
| `lib/system-prompts.ts` | プロンプトテンプレート |

### 9.2 改修するコード

| ファイル | 改修内容 |
|---------|---------|
| `app/page.tsx` | コンポーネント分割、状態管理導入 |
| `app/api/chat/route.ts` | セッション管理追加、エラーハンドリング強化 |
| `app/api/skills/list/route.ts` | DB連携 (Optional) |
| `app/api/skills/execute/route.ts` | セッション連携、ツール変換強化 |

### 9.3 新規作成

| ファイル | 内容 |
|---------|------|
| `components/chat/*.tsx` | チャットコンポーネント群 |
| `components/skills/*.tsx` | Skills関連コンポーネント |
| `components/sessions/*.tsx` | セッション関連コンポーネント |
| `lib/store/*.ts` | 状態管理 |
| `lib/api/*.ts` | APIクライアント |
| `app/api/sessions/*.ts` | Sessions API |
| `app/sessions/page.tsx` | セッション一覧ページ |

---

## 10. テスト戦略

### 10.1 ユニットテスト

```typescript
// __tests__/lib/api/client.test.ts
describe('fetchWithRetry', () => {
  it('should retry on 500 error', async () => { ... });
  it('should not retry on 400 error', async () => { ... });
  it('should respect max retries', async () => { ... });
});

// __tests__/lib/skills.test.ts
describe('buildSkillPrompt', () => {
  it('should include tool mappings', async () => { ... });
  it('should handle unknown skill', async () => { ... });
});
```

### 10.2 E2Eテスト

```typescript
// e2e/chat.spec.ts
test('should send message and receive response', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="chat-input"]', 'Hello');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();
});

test('should execute skill', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="skill-slidev-creator"]');
  await page.fill('[data-testid="chat-input"]', '自己紹介スライド');
  await page.click('[data-testid="send-button"]');
  // ...
});
```

---

## 付録: Skills詳細定義

### A. User Skills

```typescript
const USER_SKILLS: Skill[] = [
  {
    id: 'slidev-creator',
    name: 'Slidev Creator',
    description: 'Markdownベースのプレゼンテーション作成',
    category: 'user',
    icon: '📊',
    systemPromptTemplate: `
      You are a presentation creation expert using Slidev.
      Create beautiful, interactive slide decks using Markdown syntax.
      Follow Slidev best practices for layout, animations, and code highlighting.
    `,
  },
  {
    id: 'google-adk-expert',
    name: 'Google ADK Expert',
    description: 'Google Agent Development Kit の専門家',
    category: 'user',
    icon: '🤖',
    systemPromptTemplate: `
      You are an expert in Google Agent Development Kit (ADK).
      Help users build AI agents using Google's tools and best practices.
    `,
  },
  {
    id: 'claude-agent-sdk-professional',
    name: 'Claude Agent SDK Professional',
    description: 'Claude Agent SDK の実装パターン',
    category: 'user',
    icon: '🧠',
    systemPromptTemplate: `
      You are a Claude Agent SDK specialist.
      Guide users through building agents with Anthropic's SDK.
    `,
  },
  {
    id: 'neta-research',
    name: 'Neta Research',
    description: 'TV番組制作リサーチアシスタント',
    category: 'user',
    icon: '📺',
    systemPromptTemplate: `
      You are a TV program research assistant.
      Help find entertaining topics, verify facts, and prepare research materials.
    `,
  },
];
```

### B. Example Skills (Anthropic)

```typescript
const EXAMPLE_SKILLS: Skill[] = [
  {
    id: 'example-skills:skill-creator',
    name: 'Skill Creator',
    description: '新しいスキルの作成ガイド',
    category: 'example',
    icon: '🛠️',
  },
  {
    id: 'example-skills:mcp-builder',
    name: 'MCP Builder',
    description: 'MCPサーバーの構築',
    category: 'example',
    icon: '🔌',
  },
  {
    id: 'example-skills:canvas-design',
    name: 'Canvas Design',
    description: 'ビジュアルアート作成',
    category: 'example',
    icon: '🎨',
  },
  {
    id: 'example-skills:algorithmic-art',
    name: 'Algorithmic Art',
    description: 'p5.jsでアルゴリズミックアート',
    category: 'example',
    icon: '✨',
  },
];
```

### C. Backend Development Skills

```typescript
const BACKEND_SKILLS: Skill[] = [
  {
    id: 'backend-development:api-design-principles',
    name: 'API Design Principles',
    description: 'REST と GraphQL API 設計',
    category: 'backend',
    icon: '🔗',
  },
  {
    id: 'backend-development:architecture-patterns',
    name: 'Architecture Patterns',
    description: 'Clean Architecture, DDD',
    category: 'backend',
    icon: '🏗️',
  },
  {
    id: 'backend-development:microservices-patterns',
    name: 'Microservices Patterns',
    description: 'マイクロサービスアーキテクチャ',
    category: 'backend',
    icon: '🔄',
  },
];
```

### D. Developer Essentials Skills

```typescript
const ESSENTIALS_SKILLS: Skill[] = [
  {
    id: 'developer-essentials:auth-implementation-patterns',
    name: 'Auth Implementation',
    description: 'JWT, OAuth2, RBAC',
    category: 'essentials',
    icon: '🔐',
  },
  {
    id: 'developer-essentials:error-handling-patterns',
    name: 'Error Handling',
    description: 'エラーハンドリングパターン',
    category: 'essentials',
    icon: '⚠️',
  },
  {
    id: 'developer-essentials:debugging-strategies',
    name: 'Debugging Strategies',
    description: 'デバッグ戦略',
    category: 'essentials',
    icon: '🔍',
  },
  {
    id: 'developer-essentials:e2e-testing-patterns',
    name: 'E2E Testing',
    description: 'Playwright と Cypress',
    category: 'essentials',
    icon: '🧪',
  },
];
```
