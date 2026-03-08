# コンポーネント設計仕様

> **UIコンポーネントの構成と設計方針**
> 
> **最終更新**: 2026-02-22 00:17

---

## コンポーネント階層

```
components/
├── ui/                    # shadcn/ui ベース（低レベル）
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── FeatureChat.tsx    # 主要チャットコンポーネント
│   ├── FeatureButtons.tsx
│   ├── LLMSelector.tsx
│   ├── ModelSelector.tsx
│   ├── StreamingMessage.tsx
│   ├── MarkdownRenderer.tsx
│   ├── FileUpload.tsx
│   ├── GoogleDrivePicker.tsx
│   ├── ExportButton.tsx
│   ├── WordExportButton.tsx
│   └── ...
├── layout/                # レイアウトコンポーネント
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── AppLayout.tsx
│   ├── AdminLayout.tsx
│   ├── AdminSidebar.tsx
│   └── SplitPaneLayout.tsx
├── chat/                  # チャット機能（中レベル）
│   ├── ChatUI.tsx
│   ├── ChatPage.tsx
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── ChatInputArea.tsx
│   ├── AgenticResponse.tsx
│   ├── ReasoningSteps.tsx
│   ├── ProcessingFlow.tsx
│   ├── ToolCallIndicator.tsx
│   ├── PromptSuggestions.tsx
│   ├── EmptyState.tsx
│   └── types.ts
├── agent-thinking/        # エージェント思考プロセス表示
│   ├── ThinkingProcess.tsx
│   ├── ThinkingStep.tsx
│   ├── SubStep.tsx
│   └── ComputerPanel.tsx
├── research/              # リサーチ機能
│   ├── ResearchChat.tsx
│   ├── AgentTabs.tsx
│   ├── ChatInput.tsx
│   ├── EmptyState.tsx
│   ├── hooks/
│   └── message/
├── meeting-notes/         # 会議メモ機能
│   ├── FileUploadChat.tsx
│   └── GoogleDriveButtons.tsx
├── transcripts/           # 書き起こし機能
├── drive/                 # Google Drive連携
├── icons/                 # カスタムアイコン
├── providers/             # Contextプロバイダー
│   └── SessionProvider.tsx
└── LangChainChat.tsx      # LangChain統合チャット
```

---

## 命名規則

### ファイル名

| 種別 | 命名 | 例 |
|-----|------|-----|
| コンポーネント | PascalCase | `FeatureChat.tsx` |
| ユーティリティ | camelCase | `useChat.ts` |
| 型定義 | PascalCase + .types.ts | `chat/types.ts` |
| スタイル | camelCase + .ts | `admin-styles.ts` |

### コンポーネント名

```typescript
// ✅ 良い例: 機能 + 役割
function ResearchCastChat() { }
function MeetingNoteEditor() { }
function TranscriptUploader() { }
function LangChainChat() { }

// ❌ 悪い例: 抽象的すぎる
function Chat() { }  // → FeatureChat等に具体化
function Editor() { }  // → 何のEditorか明確に
```

---

## Props設計

### 基本原則

```typescript
interface FeatureChatProps {
  // 必須: 機能識別子
  featureId: string;
  
  // 必須: 表示用
  title: string;
  
  // オプション: デフォルト値あり
  placeholder?: string;
  outputFormat?: "markdown" | "plaintext";
  model?: string;
  enableStreaming?: boolean;
  
  // オプション: コールバック
  onMessageSent?: (message: Message) => void;
  onExport?: (format: string) => void;
}
```

### 共通Propsパターン

```typescript
// ローディング状態
interface WithLoading {
  isLoading?: boolean;
}

// エラー状態
interface WithError {
  error?: Error | null;
  onRetry?: () => void;
}

// 選択状態
interface WithSelection<T> {
  value: T;
  onChange: (value: T) => void;
}

// ファイル添付
interface WithAttachments {
  attachments?: File[];
  onAttach?: (files: File[]) => void;
  onRemoveAttachment?: (index: number) => void;
}
```

---

## Server/Client境界

### Server Components（デフォルト）

```typescript
// ✅ データ取得可能、JSバンドル小
async function ProgramSettingsPage() {
  const settings = await getProgramSettings();
  return <SettingsForm initialData={settings} />;
}
```

### Client Components

```typescript
// ✅ インタラクション必要、ブラウザAPI使用
"use client";

function FeatureChat({ featureId }: { featureId: string }) {
  const [messages, setMessages] = useState([]);
  // イベントハンドラ、useEffect等
}
```

### 境界の判断基準

| Server | Client |
|--------|--------|
| データ取得（直接DB/API） | イベントハンドラ（onClick等） |
| 静的コンテンツ | useState, useEffect |
| SEO重要ページ | ブラウザAPI使用 |
| 初期レンダリング | リアルタイム更新（Streaming） |

---

## スタイル設計

### カラー使用規則

**基本原則**: モノトーン（グレースケール）のみ使用

```typescript
// ✅ 良い例: グレーのみ
<div className="bg-white border border-gray-200 text-gray-900" />

// ❌ 悪い例: カラー使用
<div className="bg-blue-500 text-red-600" />
```

**例外**（管理画面のみ）:
```typescript
// 管理画面のアクティブ状態
'bg-amber-50 text-amber-700 border-amber-200'
```

### 共通スタイルパターン

```typescript
// カード
const cardStyle = 'bg-white border border-gray-200 rounded-xl shadow-sm';

// ボタン（プライマリー）
const buttonPrimary = 'bg-gray-900 text-white hover:bg-gray-800';

// ボタン（セカンダリー）
const buttonSecondary = 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50';

// 入力欄
const inputStyle = 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-900';

// ナビゲーション（アクティブ）
const navActive = 'bg-white text-gray-900 border-gray-200';

// ナビゲーション（非アクティブ）
const navInactive = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
```

---

## エージェント思考プロセスUI

### 概要

Manus風の階層的ステップ表示コンポーネント群。

### コンポーネント構成

| コンポーネント | ファイル | 役割 |
|-------------|---------|------|
| ThinkingProcess | `ThinkingProcess.tsx` | メインコンテナ、ステップ管理 |
| ThinkingStep | `ThinkingStep.tsx` | 個別ステップ（折りたたみ対応） |
| SubStep | `SubStep.tsx` | 検索クエリ、ツール呼び出し表示 |
| ComputerPanel | `ComputerPanel.tsx` | 検索結果表示パネル |

### 型定義

```typescript
// types/agent-thinking.ts
interface ThinkingStep {
  id: string;
  stepNumber: number;
  type: 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete';
  title: string;
  content?: string;
  status: 'running' | 'completed' | 'error';
  subSteps: SubStep[];
  searchResults?: SearchResultItem[];
}
```

### 使用例

```typescript
import { ThinkingProcess } from "@/components/agent-thinking/ThinkingProcess";

<ThinkingProcess
  steps={thinkingSteps}
  activeStepId={activeStepId}
  overallStatus="running"
  events={thinkingEvents}
/>
```

---

## 主要コンポーネント

### FeatureChat

主要なチャットUIコンポーネント。全機能で共通使用。

```typescript
// components/ui/FeatureChat.tsx
interface FeatureChatProps {
  featureId: string;
  title: string;
  description?: string;
  systemPrompt: string;
  placeholder?: string;
  showSuggestions?: boolean;
  enableFileUpload?: boolean;
  enableGoogleDrive?: boolean;
  outputFormat?: 'markdown' | 'plaintext';
}
```

### LangChainChat

LangChain統合のための高度なチャットコンポーネント。

```typescript
// components/LangChainChat.tsx
interface LangChainChatProps {
  featureId: string;
  title: string;
  agentConfig?: AgentConfig;
  enableTools?: boolean;
  enableRAG?: boolean;
}
```

### StreamingMessage

ストリーミングレスポンス表示用コンポーネント。

```typescript
// components/ui/StreamingMessage.tsx
interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
  reasoningSteps?: ReasoningStep[];
}
```

---

## 関連ファイル

- `components/ui/` - shadcn/uiコンポーネント
- `components/agent-thinking/` - エージェント思考プロセスUI
- `components/chat/` - チャット機能コンポーネント
- `types/agent-thinking.ts` - 型定義
- `hooks/useTypingAnimation.ts` - タイピングアニメーション
- `hooks/useThinkingSteps.ts` - 思考ステップ管理
- `app/` - ページコンポーネント
- [system-architecture.md](./system-architecture.md) - 全体構成
- [theme-system.md](../../theme-system.md) - テーマシステム詳細
