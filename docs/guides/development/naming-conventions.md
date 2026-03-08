# 命名規約と型定義ガイド

> **ファイル、変数、型の命名標準**
> 
> **最終更新**: 2026-02-20 13:16

---

## 📁 ファイル命名

### アーカイブファイル命名（重要）

`archive/` ディレクトリに移動するファイルは、**必ず日付プレフィックスを付ける**。

| 状況 | 命名規則 | 例 |
|-----|---------|-----|
| 計画書をアーカイブ | `YYYY-MM-DD-元のファイル名.md` | `2026-02-24-sidebar-redesign.md` |
| 仕様書をアーカイブ | `YYYY-MM-DD-元のファイル名.md` | `2026-02-24-performance.md` |
| レポートをアーカイブ | `YYYY-MM-DD-レポート名.md` | `2026-02-22-refactoring-completed.md` |

**日付の取得コマンド:**
```bash
# アーカイブ時のファイル名用
date +"%Y-%m-%d"

# 完全なファイル名を生成
mv old-file.md "archive/$(date +%Y-%m-%d)-old-file.md"
```

### ディレクトリ構造別

| 配置場所 | 命名規則 | 例 |
|---------|---------|-----|
| `app/` ページ | `page.tsx` | `app/agent/page.tsx` |
| `app/` レイアウト | `layout.tsx` | `app/(authenticated)/layout.tsx` |
| `app/` ローディング | `loading.tsx` | `app/dashboard/loading.tsx` |
| `app/` エラー | `error.tsx` | `app/error.tsx` |
| `app/api/` | `route.ts` | `app/api/meeting-notes/route.ts` |
| `components/` | `PascalCase.tsx` | `FeatureChat.tsx` |
| `components/ui/` | `kebab-case.tsx` | `word-export-button.tsx` |
| `lib/` ユーティリティ | `camelCase.ts` | `formatDate.ts` |
| `lib/` 機能別 | `kebab-case.ts` | `chat-history.ts` |
| `types/` | `kebab-case.ts` | `api.types.ts` |
| `hooks/` | `useCamelCase.ts` | `useChat.ts` |
| `tests/` | `*.test.ts` | `formatDate.test.ts` |

### ファイル名の例

```
app/
├── (authenticated)/
│   ├── layout.tsx              # 認証レイアウト
│   ├── page.tsx                # ダッシュボード
│   ├── loading.tsx             # ローディングUI
│   ├── error.tsx               # エラーバウンダリー
│   ├── agent/
│   │   ├── page.tsx            # Agentページ（リダイレクト）
│   │   ├── cast/page.tsx       # 出演者リサーチ
│   │   ├── evidence/page.tsx   # エビデンスリサーチ
│   │   # location/page.tsx     # 場所リサーチ（4月以降実装予定）
│   │   # info/page.tsx         # 情報リサーチ（4月以降実装予定）
│   └── meeting-notes/
│       └── page.tsx            # 議事録ページ
├── api/
│   ├── meeting-notes/
│   │   └── route.ts            # 議事録API
│   └── transcripts/
│       └── route.ts            # 文字起こしAPI

components/
├── ui/
│   ├── button.tsx              # shadcn/ui ベース
│   ├── word-export-button.tsx  # カスタムボタン
│   └── file-upload.tsx         # ファイルアップロード
├── layout/
│   ├── Sidebar.tsx             # サイドバー
│   └── Header.tsx              # ヘッダー
├── chat/
│   ├── FeatureChat.tsx         # 機能別チャット
│   └── MessageBubble.tsx       # メッセージ表示
└── chat/
    ├── ChatPage.tsx            # チャットページ
    ├── ChatInput.tsx           # チャット入力
    └── ChatMessage.tsx         # メッセージ表示

lib/
├── prisma.ts                   # Prismaクライアント
├── logger.ts                   # ロガー
├── errors.ts                   # エラークラス
├── llm/
│   ├── clients/
│   │   ├── gemini.ts           # Geminiクライアント（現在は未使用）
│   │   └── grok.ts             # Grokクライアント
│   └── utils.ts                # LLMユーティリティ
├── prompts/
│   ├── db.ts                   # プロンプトDB管理
│   ├── minutes.ts              # 議事録プロンプト
│   └── research-cast.ts        # 出演者リサーチプロンプト
└── chat/
    ├── agents.ts               # Agent定義（旧gems.ts）
    ├── gems.ts                 # Gem定義（後方互換性のためエイリアスとして維持）
    └── history.ts              # 履歴管理

types/
├── api.types.ts                # API関連の型
├── chat.types.ts               # チャット関連の型
├── llm.types.ts                # LLM関連の型
└── next-auth.d.ts              # next-auth拡張
```

---

## 🏷️ 型命名

### 基本規則

| 種別 | 命名規則 | 例 |
|-----|---------|-----|
| インターフェース | `PascalCase` | `UserProfile`, `ChatMessage` |
| 型エイリアス | `PascalCase` | `MessageType`, `APIResponse` |
| 列挙型 | `PascalCase` | `MessageRole`, `LLMProvider` |
| ジェネリクス | `T` + `PascalCase` | `TResponse`, `TParams` |
| Props型 | `ComponentName` + `Props` | `FeatureChatProps` |

### Props型の命名

```typescript
// ✅ 良い例
interface FeatureChatProps {
  featureId: string;
  title: string;
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

// ❌ 悪い例
interface Props { }           // 名前が不十分
interface ChatProps { }       // コンポーネント名と一致しない
```

### 列挙型の命名

```typescript
// ✅ 良い例（PascalCase）
enum MessageRole {
  User = "user",
  Assistant = "assistant",
  System = "system",
}

enum LLMProvider {
  Gemini = "gemini",
  Grok = "grok",
  Perplexity = "perplexity",
}

// union型を使用する場合も同様
type MessageRole = "user" | "assistant" | "system";
```

### ジェネリクスの命名

```typescript
// ✅ 標準的な命名
function fetchData<TResponse>(url: string): Promise<TResponse>;

function createEntity<TData, TResult>(
  data: TData
): Promise<TResult>;

// ✅ 意味のある命名（複雑な場合）
interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
  page: number;
}
```

---

## 🔤 変数命名

### 基本規則

| 種別 | 命名規則 | 例 |
|-----|---------|-----|
| 定数 | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 変数 | `camelCase` | `userName`, `isLoading` |
| プライベート | `_` + `camelCase` | `_internalValue` |
| boolean | `is`/`has`/`can`/`should` + 名詞 | `isValid`, `hasPermission` |
| 配列 | 複数形または `List` 接尾辞 | `users`, `messageList` |
| 関数 | 動詞 + 名詞 | `getUserById`, `formatDate` |
| イベントハンドラ | `handle` + イベント名 | `handleClick`, `handleSubmit` |
| カスタムフック | `use` + `PascalCase` | `useChat`, `useLocalStorage` |

### boolean変数

```typescript
// ✅ 良い例
const isLoading = false;
const hasError = true;
const canSubmit = form.isValid;
const shouldRetry = error.code === "TIMEOUT";
const isAuthenticated = !!session;

// ❌ 悪い例
const loading = false;       // 曖昧
const error = true;          // エラーオブジェクトと区別がつかない
const submit = true;         // 動詞なので関数と区別がつかない
```

### 配列・コレクション

```typescript
// ✅ 良い例（複数形）
const users: User[] = [];
const messages: Message[] = [];
const settings: Record<string, string> = {};

// ✅ 良い例（List接尾辞）
const userList: User[] = [];
const messageList: Message[] = [];

// ❌ 悪い例
const userArray: User[] = [];     // 型で配列であることは明確
const messageData: Message[] = []; // 抽象的すぎる
```

### 関数

```typescript
// ✅ 良い例（動詞 + 名詞）
function getUserById(id: string): Promise<User>;
function formatDate(date: Date, format: string): string;
function validateEmail(email: string): boolean;
function createMeetingNote(data: CreateNoteInput): Promise<Note>;
function updateChatHistory(messages: Message[]): void;

// ✅ イベントハンドラ
function handleClick(event: MouseEvent): void;
function handleSubmit(data: FormData): void;
function handleMessageSend(content: string): void;

// ❌ 悪い例
function user() { }           // 名詞のみ
function data() { }           // 抽象的
function process() { }        // 曖昧
function doSomething() { }    // 何をするか不明
```

### 定数

```typescript
// ✅ 良い例
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = "/api";
const DEFAULT_PAGE_SIZE = 20;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30分

// 列挙型のような定数群
const LLM_PROVIDERS = {
  GEMINI: "gemini",
  GROK: "grok",
  PERPLEXITY: "perplexity",
} as const;

// ❌ 悪い例
const maxRetry = 3;           // camelCaseは変数に使用
const apiUrl = "/api";        // 定数は大文字
const timeout = 1800000;      // マジックナンバー
```

---

## 🧩 React 固有の命名

### コンポーネント

```typescript
// ✅ 良い例（機能 + 役割）
function AgentCastChat() { }
function MeetingNoteEditor() { }
function TranscriptUploader() { }
function WordExportButton() { }

// ❌ 悪い例
function Chat() { }           // 抽象的すぎる
function Editor() { }         // 何のEditorか不明
function Button() { }         // 基本コンポーネントと区別がつかない
```

### カスタムフック

```typescript
// ✅ 良い例（use + 機能）
function useChat(featureId: string) { }
function useLocalStorage<T>(key: string, initialValue: T) { }
function useDebounce<T>(value: T, delay: number) { }
function useAuth() { }

// ❌ 悪い例
function chatHook() { }       // useプレフィックスがない
function useData() { }        // 抽象的すぎる
function useStuff() { }       // 意味不明
```

### Context

```typescript
// ✅ 良い例
const AuthContext = createContext<AuthContextType>({});
const ChatContext = createContext<ChatContextType>({});

// Provider
function AuthProvider({ children }: { children: React.ReactNode }) { }
function ChatProvider({ children }: { children: React.ReactNode }) { }

// 使用時の関数名
function useAuth() { }
function useChat() { }
```

---

## 🗄️ データベース関連

### Prisma モデル

```prisma
// ✅ 良い例（PascalCase + 単数形）
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  
  // リレーション
  meetingNotes MeetingNote[]
  
  @@map("users")
}

model MeetingNote {
  id        String   @id @default(cuid())
  title     String
  content   String?
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  // リレーション
  user User @relation(fields: [userId], references: [id])
  
  @@map("meeting_notes")
}
```

### 命名規則

| 項目 | 規則 | 例 |
|-----|------|-----|
| モデル名 | PascalCase, 単数形 | `User`, `MeetingNote` |
| テーブル名 | snake_case, 複数形 | `users`, `meeting_notes` |
| カラム名 | camelCase | `createdAt`, `userId` |
| 外部キー | 参照モデル + Id | `userId`, `programId` |
| リレーション名 | camelCase, 複数形 | `meetingNotes`, `users` |

---

## 📝 コメントとドキュメント

### JSDoc

```typescript
/**
 * ユーザーをIDで取得する
 * @param id - ユーザーID
 * @returns ユーザー情報。見つからない場合はnull
 * @throws {NotFoundError} ユーザーが存在しない場合
 * @example
 * const user = await getUserById("user_123");
 * if (user) {
 *   console.log(user.name);
 * }
 */
async function getUserById(id: string): Promise<User | null> {
  // 実装
}
```

### TODOコメント

```typescript
// TODO: [優先度] 説明
// TODO: [高] エラーハンドリングの改善が必要
// TODO: [中] パフォーマンス最適化の検討
// TODO: [低] リファクタリング候補

// FIXME: 既知の問題を修正
// FIXME: 型エラーの一時的回避
// FIXME: 2026-03-01までに対応

// NOTE: 実装の意図を説明
// NOTE: この処理はパフォーマンスのため意図的に複雑にしている
// NOTE: 依存パッケージの制約によりこの実装になっている
```

---

## 🔗 関連ドキュメント

| 項目 | 参照先 |
|-----|--------|
| コンポーネント設計 | [../../specs/component-design.md](../../specs/component-design.md) |
| コードレビュー | [./code-review-checklist.md](./code-review-checklist.md) |
| 開発ワークフロー | [./workflow-standards.md](./workflow-standards.md) |
