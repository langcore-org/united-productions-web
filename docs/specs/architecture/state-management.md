# 状態管理仕様

> **React状態管理の設計方針**
> 
> **最終更新**: 2026-02-22 00:17

---

## 基本方針

| 状態の種類 | 管理方法 | 例 |
|-----------|---------|-----|
| グローバル認証状態 | NextAuth.js + React Context | `SessionProvider` |
| サーバー状態 | SWR（推奨） | APIデータ取得 |
| フォーム状態 | React Hook Form | 各種入力フォーム |
| ローカルUI状態 | useState / useReducer | モーダル開閉、タブ切り替え |
| 共有機能状態 | カスタムフック | `useLLM`, `useResearchChat` |
| ストリーミング状態 | useState + useCallback | リアルタイムメッセージ |

---

## カスタムフック設計

### 命名規則

```
hooks/
├── use-llm.ts              # LLM通信管理
├── useLangChainChat.ts     # LangChain統合チャット
├── useResearchChat.ts      # リサーチ機能
├── useThinkingSteps.ts     # 思考ステップ管理
├── useConversationSave.ts  # 会話保存
├── useFileUpload.ts        # ファイルアップロード
├── useGoogleDrive.ts       # Google Drive連携
├── useTypingAnimation.ts   # タイピングアニメーション
└── useWordExport.ts        # Word出力
```

### フックの責務範囲

```typescript
// ✅ 良い例: 単一責任
function useLLM(featureId: string) {
  // LLM通信の管理のみ
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sendMessage = async (content: string) => { ... };
  return { messages, sendMessage, isStreaming };
}

// ❌ 悪い例: 責務が多すぎる
function useLLM(featureId: string) {
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({}); // 別フックに分離
  const [exportData, setExportData] = useState({}); // 別フックに分離
  // ...
}
```

---

## Context使用方針

### 使用基準

| 使用する | 使用しない |
|---------|-----------|
| 認証状態（NextAuth統合） | 単一コンポーネントのみで使用 |
| テーマ設定 | 深い階層に渡す必要がない |
| グローバル設定 | useStateで十分な場合 |

### 実装パターン

```typescript
// components/providers/SessionProvider.tsx
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children, session }) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
```

---

## サーバー状態管理

### 推奨: SWR

```typescript
// データ取得
const { data, error, isLoading, mutate } = useSWR(
  '/api/chat/history',
  fetcher,
  {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  }
);

// データ更新（楽観的更新）
const sendMessage = async (content: string) => {
  // 楽観的更新
  mutate(
    (current) => [...current, { content, role: 'user' }],
    false
  );
  
  // API呼び出し
  await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ content }) });
  
  // 再検証
  mutate();
};
```

### キャッシュ戦略

| データ種別 | キャッシュ戦略 | 理由 |
|-----------|---------------|------|
| チャット履歴 | 5分間キャッシュ | 頻繁に変化しない |
| ユーザー設定 | 1分間キャッシュ | 変更時のみ更新 |
| LLMレスポンス | キャッシュなし | リアルタイム必須 |
| ファイル一覧 | フォーカス時再検証 | 外部変更の可能性 |

---

## ストリーミング状態管理

### SSE（Server-Sent Events）

```typescript
// hooks/use-llm.ts
export function useLLM(featureId: string) {
  const [streamingContent, setStreamingContent] = useState('');
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setIsStreaming(true);
    setStreamingContent('');
    
    const eventSource = new EventSource(`/api/chat/stream?featureId=${featureId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'content') {
        setStreamingContent((prev) => prev + data.content);
      } else if (data.type === 'thinking') {
        setThinkingSteps((prev) => [...prev, data.step]);
      }
    };
    
    eventSource.onerror = () => {
      setIsStreaming(false);
      eventSource.close();
    };
  }, [featureId]);

  return { streamingContent, thinkingSteps, isStreaming, sendMessage };
}
```

---

## フォーム状態管理

### React Hook Form

```typescript
// 設定フォーム
function SettingsForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: async () => fetchSettings(),
  });

  const onSubmit = async (data) => {
    await saveSettings(data);
    toast.success('設定を保存しました');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('programName', { required: true })} />
      {errors.programName && <span>必須項目です</span>}
    </form>
  );
}
```

---

## 状態の永続化

### ローカルストレージ

```typescript
// ユーザー設定の永続化
function useUserSettings() {
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return defaultSettings;
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings];
}
```

### データベース永続化

```typescript
// チャット履歴の保存
const { trigger: saveConversation } = useSWRMutation(
  '/api/conversations',
  (url, { arg }) => fetch(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  })
);
```

---

## 関連ファイル

- `components/providers/` - Contextプロバイダー
- `hooks/` - カスタムフック
- `hooks/use-llm.ts` - LLM通信
- `hooks/useLangChainChat.ts` - LangChain統合
- `hooks/useThinkingSteps.ts` - 思考ステップ
- [performance.md](../operations/performance.md) - キャッシュ戦略詳細
