# コンポーネント設計仕様

> **UIコンポーネントの構成と設計方針**
> 
> **最終更新**: 2026-02-20 13:10

## コンポーネント階層

```
components/
├── ui/                    # shadcn/ui ベース（低レベル）
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── layout/                # レイアウトコンポーネント
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── ...
├── chat/                  # 機能別（中レベル）
│   ├── feature-chat.tsx
│   └── message-bubble.tsx
├── research/              # 機能別
├── meeting-notes/         # 機能別
└── transcripts/           # 機能別
```

## 命名規則

### ファイル名

| 種別 | 命名 | 例 |
|-----|------|-----|
| コンポーネント | PascalCase | `FeatureChat.tsx` |
| ユーティリティ | camelCase | `useChat.ts` |
| 型定義 | PascalCase + .types.ts | `chat.types.ts` |

### コンポーネント名

```typescript
// ✅ 良い例: 機能 + 役割
function ResearchCastChat() { }
function MeetingNoteEditor() { }
function TranscriptUploader() { }

// ❌ 悪い例: 抽象的すぎる
function Chat() { }  // → FeatureChat等に具体化
function Editor() { }  // → 何のEditorか明確に
```

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
  
  // オプション: コールバック
  onMessageSent?: (message: Message) => void;
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
```

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

## 関連ファイル

- `components/ui/` - shadcn/uiコンポーネント
- `app/` - ページコンポーネント
- [system-architecture.md](./system-architecture.md) - 全体構成
