# 状態管理仕様

> **React状態管理の設計方針**
> 
> **最終更新**: 2026-02-20 13:10

## 基本方針

| 状態の種類 | 管理方法 | 例 |
|-----------|---------|-----|
| グローバル認証状態 | React Context | `AuthProvider` |
| サーバー状態 | TanStack Query (推奨) / SWR | APIデータ取得 |
| フォーム状態 | React Hook Form | 各種入力フォーム |
| ローカルUI状態 | useState / useReducer | モーダル開閉、タブ切り替え |
| 共有機能状態 | カスタムフック | `useChat`, `useResearch` |

## カスタムフック設計

### 命名規則

```typescript
// 機能 + 用途
custom hooks/
├── useChat.ts           # チャット機能全体
├── useChatHistory.ts    # チャット履歴管理
├── useResearch.ts       # リサーチ機能
├── useMeetingNotes.ts   # 議事録機能
└── useTranscripts.ts    # 書き起こし機能
```

### フックの責務範囲

```typescript
// ✅ 良い例: 単一責任
function useChat(featureId: string) {
  // チャットメッセージの管理のみ
  const [messages, setMessages] = useState<Message[]>([]);
  const sendMessage = async (content: string) => { ... };
  return { messages, sendMessage };
}

// ❌ 悪い例: 責務が多すぎる
function useChat(featureId: string) {
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({}); // 別フックに分離
  const [exportData, setExportData] = useState({}); // 別フックに分離
  // ...
}
```

## Context使用方針

### 使用基準

| 使用する | 使用しない |
|---------|-----------|
| 認証状態（アプリ全体で必要） | 単一コンポーネントのみで使用 |
| テーマ設定 | 深い階層に渡す必要がない |
| 多言語設定（将来） | useStateで十分な場合 |

### 実装パターン

```typescript
// providers/auth-provider.tsx
export function AuthProvider({ children }) {
  const [session, setSession] = useState<Session | null>(null);
  // ...
  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## サーバー状態管理

### 推奨: TanStack Query

```typescript
// データ取得
const { data, isLoading, error } = useQuery({
  queryKey: ['chat-history', featureId],
  queryFn: () => fetchChatHistory(featureId),
  staleTime: 5 * 60 * 1000, // 5分
});

// データ更新
const mutation = useMutation({
  mutationFn: saveChatHistory,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['chat-history'] });
  },
});
```

### キャッシュ戦略

| データ種別 | staleTime | cacheTime |
|-----------|-----------|-----------|
| チャット履歴 | 5分 | 10分 |
| ユーザー設定 | 1分 | 5分 |
| LLMレスポンス | 0（リアルタイム） | 0 |

## 関連ファイル

- `components/providers/` - Contextプロバイダー
- `hooks/` - カスタムフック
- [performance.md](./performance.md) - キャッシュ戦略詳細
