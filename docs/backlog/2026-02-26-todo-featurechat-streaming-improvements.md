# FeatureChat・useLLMStream 改善タスク（精査済み）

> **優先度**: 🔴 高（4件）/ 🟡 中（1件）/ 🟢 低（2件）
> **発見日**: 2026-02-26
> **最終更新**: 2026-02-26（精査完了）
> **発見者**: AI Agent（コードレビュー）
> **関連ファイル**: 
> - `components/ui/FeatureChat.tsx`
> - `components/ui/ChatInputArea.tsx`
> - `components/chat/StreamingSteps.tsx`
> - `hooks/useLLMStream/index.ts`
> - `docs/lessons/2026-02-26-chat-streaming-loading-issue.md`

---

## 🔴 高優先度（バグ修正）

### 1. `handleSuggestionClick` の依存配列漏れ

**状態**: ✅ **問題確認済み** - 修正必須

**問題**: `featureId` が依存配列に含まれていない

```typescript
// FeatureChat.tsx 241行目（現在）
const handleSuggestionClick = useCallback(
  async (suggestionText: string) => {
    // ...
    startStream(streamMessages, provider, featureId, selectedProgramId);
    //                        ここで featureId を使用 ↑
  },
  [isPending, provider, startStream, buildStreamMessages, selectedProgramId],
  // ❌ featureId が欠落
);
```

**影響**:
- `featureId` が props で変更されても、古い値が使用され続ける
- 例: 同じ FeatureChat コンポーネントを異なる featureId で再利用する場合に発生
- React の eslint（exhaustive-deps）でも検出されるはず

**対応**:
```typescript
}, [isPending, provider, startStream, buildStreamMessages, selectedProgramId, featureId]);
```

**検証コマンド**:
```bash
npm run lint  # exhaustive-deps ルールで検出されるはず
```

---

### 2. `StreamingSteps` に `error` が渡されていない

**状態**: ✅ **問題確認済み** - 修正必須

**問題**: FeatureChat.tsx で StreamingSteps を使用する際に `error` prop を渡していない

```typescript
// FeatureChat.tsx 317-326行目（現在）
{isPending && (
  <StreamingSteps
    content={content}
    toolCalls={toolCalls}
    summarizationEvents={summarizationEvents}
    usage={usage}
    provider={provider}
    isComplete={isComplete}
    // ❌ error が欠落！
  />
)}
```

```typescript
// StreamingSteps.tsx 16-24行目（定義）
export function StreamingSteps({
  content,
  toolCalls,
  summarizationEvents,
  usage,
  provider,
  isComplete,
  error,  // ← 受け取る準備はできている
}: StreamingStepsProps) {
```

**影響**:
- ストリーミング中にエラーが発生しても、UI にエラーメッセージが表示されない
- ユーザーは「何も起きない」状態になる可能性がある

**対応**:
```typescript
// FeatureChat.tsx から error を取得
const {
  content,
  isComplete,
  isPending,
  error,  // ← 追加
  // ...
} = useLLMStream();

// StreamingSteps に渡す
{isPending && (
  <StreamingSteps
    content={content}
    toolCalls={toolCalls}
    summarizationEvents={summarizationEvents}
    usage={usage}
    provider={provider}
    isComplete={isComplete}
    error={error}  // ← 追加
  />
)}
```

---

### 3. `isComplete && content` の判定が不完全

**状態**: ✅ **問題確認済み** - 修正推奨

**問題**: エラー時やキャンセル時にも `content` が存在する場合、誤ってメッセージが保存される

```typescript
// FeatureChat.tsx 147-163行目（現在）
useEffect(() => {
  if (isComplete && content) {  // ← 問題の判定
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content,  // エラー時の部分的な内容が保存される可能性
      timestamp: new Date(),
      llmProvider: provider,
    };
    setMessages((prev) => {
      const newMessages = [...prev, assistantMessage];
      saveConversation(newMessages, currentChatId);
      return newMessages;
    });
    resetStream();
  }
}, [isComplete, content, currentChatId, provider, resetStream, saveConversation]);
```

**`isComplete` の定義**:
```typescript
// useLLMStream/index.ts 54-55行目
const isPending = phase === "preparing" || phase === "streaming";
const isComplete = !isPending;
// → phase が "idle", "complete", "error", "cancelled" のいずれかで true
```

**発生シナリオ**:
| シナリオ | phase | isComplete | content | 結果 |
|---------|-------|-----------|---------|------|
| 正常完了 | complete | true | "回答内容" | ✅ 保存されるべき |
| エラー発生 | error | true | "部分的..." | ❌ 保存されるべきではない |
| キャンセル | cancelled | true | "部分的..." | ❌ 保存されるべきではない |
| アイドル | idle | true | "" | ✅ 保存されない（contentが空） |

**対応案1**（推奨）:
```typescript
// useLLMStream から phase を取得
const { ..., phase } = useLLMStream();

// 正常完了時のみ保存
useEffect(() => {
  if (phase === "complete" && content) {
    // メッセージ保存処理
  }
}, [phase, content, currentChatId, provider, resetStream, saveConversation]);
```

**対応案2**（最小変更）:
```typescript
// error がない場合のみ保存
useEffect(() => {
  if (isComplete && content && !error) {
    // メッセージ保存処理
  }
}, [isComplete, content, error, currentChatId, provider, resetStream, saveConversation]);
```

---

### 4. `generateFollowUp` のメモリリーク

**状態**: ✅ **問題確認済み** - 修正推奨

**問題**: コンポーネントがアンマウント後も `setFollowUp` が呼ばれる可能性がある

```typescript
// useLLMStream/index.ts 140-169行目
const generateFollowUp = async () => {
  setFollowUp({ questions: [], isLoading: true, error: null });
  try {
    const response = await fetch("/api/llm/follow-up", { ... });
    // ...
    setFollowUp({ questions: data.questions || [], isLoading: false, error: null });
    // ↑ コンポーネントがアンマウント後に呼ばれる可能性
  } catch (err) {
    setFollowUp({ questions: [], isLoading: false, error: errorMessage });
    // ↑ 同上
  }
};

// 209行目: 非同期で実行
void generateFollowUp();
```

**発生条件**:
1. ストリーミングが完了し、フォローアップ生成が開始される
2. ユーザーが画面を移動（コンポーネントアンマウント）
3. フォローアップ API レスポンスが返ってくる
4. アンマウント済みコンポーネントで `setFollowUp` が呼ばれる
5. React Warning: "Can't perform a React state update on an unmounted component"

**対応案**:
```typescript
export function useLLMStream(options: UseLLMStreamOptions = {}) {
  // ... 既存コード ...
  
  // マウント状態を追跡
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const generateFollowUp = async () => {
    setFollowUp({ questions: [], isLoading: true, error: null });
    try {
      const response = await fetch("/api/llm/follow-up", { ... });
      if (!isMountedRef.current) return; // アンマウント後は早期リターン
      // ...
    } catch (err) {
      if (!isMountedRef.current) return;
      // ...
    }
  };
  // ...
}
```

**代替案**（AbortController使用）:
```typescript
const followUpAbortRef = useRef<AbortController | null>(null);

const generateFollowUp = async () => {
  followUpAbortRef.current?.abort();
  followUpAbortRef.current = new AbortController();
  
  setFollowUp({ questions: [], isLoading: true, error: null });
  try {
    const response = await fetch("/api/llm/follow-up", {
      ...,
      signal: followUpAbortRef.current.signal,
    });
    // ...
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    // ...
  }
};

// cleanup に追加
const cleanup = useCallback(() => {
  abortControllerRef.current?.abort();
  abortControllerRef.current = null;
  followUpAbortRef.current?.abort();  // ← 追加
  followUpAbortRef.current = null;    // ← 追加
}, []);
```

---

## 🟡 中優先度（UX改善）

### 5. ストリーミング停止ボタンの実装

**状態**: 🔄 **実装計画必要**

**問題**: `cancelStream` は実装済みだが UI で使用されていない

```typescript
// FeatureChat.tsx 82-93行目（現在）
const {
  content,
  isComplete,
  isPending,
  error,
  usage,
  toolCalls,
  summarizationEvents,
  followUp,
  startStream,
  resetStream,
  // ❌ cancelStream が抜けている
} = useLLMStream();
```

**必要な変更**:

1. **ChatInputArea.tsx** に停止ボタン用の props を追加:
```typescript
export interface ChatInputAreaProps {
  // ... 既存 props ...
  onCancel?: () => void;  // ← 追加
}
```

2. **FeatureChat.tsx** で使用:
```typescript
const { ..., cancelStream } = useLLMStream();

const handleCancel = useCallback(() => {
  cancelStream();
}, [cancelStream]);

<ChatInputArea
  ...
  isStreaming={isPending}
  onCancel={isPending ? handleCancel : undefined}
/>
```

**実装案**（ChatInputArea.tsx）:
```typescript
// 104-119行目付近
<div className="flex gap-3 items-end">
  {/* ... */}
  {isStreaming && onCancel ? (
    <Button
      onClick={onCancel}
      className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white"
    >
      <Square className="w-4 h-4" />  {/* 停止アイコン */}
    </Button>
  ) : (
    <Button
      onClick={onSend}
      disabled={!input.trim() || !!isStreaming}
      // ...
    >
      <Send className="w-4 h-4" />
    </Button>
  )}
</div>
```

---

## 🟢 低優先度（堅牢性・保守性）

### 6. `handleSend` のエラーハンドリング追加

**状態**: 🔄 **検討段階**

**問題**: `startStream` 内で発生したエラーが FeatureChat 側で捕捉されていない

```typescript
// FeatureChat.tsx 196-198行目（現在）
const streamMessages = buildStreamMessages(userMessage.content, messages);
await startStream(streamMessages, provider, featureId, selectedProgramId);
// ❌ try-catch なし
```

**検討事項**:
- `startStream` 内ですでにエラーハンドリングが行われている（`setError`）
- ただし、`handleSend` 側で追加のエラー処理が必要な場合がある（トースト通知など）

**対応案**:
```typescript
const handleSend = async () => {
  // ... メッセージ構築 ...
  
  try {
    await startStream(streamMessages, provider, featureId, selectedProgramId);
  } catch (err) {
    // useLLMStream 内でエラー処理済みだが、必要に応じて追加処理
    console.error("Failed to start stream:", err);
    // オプション: トースト通知、ログ送信など
  }
};
```

**優先度が低い理由**:
- `startStream` 内でエラーは捕捉・処理されている
- 現状の実装でも機能的に問題はない

---

### 7. 追加テストケース

**状態**: 🔄 **計画段階**

**追加すべきテスト**:

```typescript
// tests/hooks/useLLMStream.test.ts

describe("追加の状態遷移テスト", () => {
  it("preparing → streaming → complete の順序で遷移する", async () => {
    const phases: StreamPhase[] = [];
    // フェーズ変更を監視して順序を検証
  });

  it("cancelStream 後に startStream を呼ぶと正常に動作する", async () => {
    // キャンセル後の再開テスト
  });

  it("error 後に resetStream を呼ぶと phase=idle に戻る", async () => {
    // エラー後のリセットテスト
  });
});

// FeatureChat.tsx のテスト（存在しない場合は新規作成）
describe("FeatureChat", () => {
  it("エラー時に StreamingSteps に error が渡される", async () => {
    // error prop の検証
  });

  it("エラー時にメッセージが保存されない", async () => {
    // isComplete && content 判定の検証
  });
});
```

---

## チェックリスト

- [ ] 🔴 **1**. `handleSuggestionClick` の依存配列に `featureId` を追加
  - 影響: 低（`featureId` が変更されるケースは稀）
  - 修正工数: 5分
- [ ] 🔴 **2**. `StreamingSteps` に `error` prop を渡す
  - 影響: 中（エラー表示がないとユーザーが困惑する）
  - 修正工数: 10分
- [ ] 🔴 **3**. `phase === "complete"` を使用した判定に変更
  - 影響: 中（エラー時の誤保存を防ぐ）
  - 修正工数: 15分
- [ ] 🔴 **4**. `generateFollowUp` のメモリリーク対策
  - 影響: 低（頻繁な画面遷移時のみ問題）
  - 修正工数: 20分
- [ ] 🟡 **5**. ストリーミング停止ボタンの実装
  - 影響: 中（UX向上）
  - 修正工数: 30分（ChatInputArea修正含む）
- [ ] 🟢 **6**. `handleSend` のエラーハンドリング追加
  - 影響: 低
  - 修正工数: 10分
- [ ] 🟢 **7**. 追加テストケースの実装
  - 影響: 低（品質向上）
  - 修正工数: 1時間

---

## 備考

### 発見経緯

これらの問題は `docs/lessons/2026-02-26-chat-streaming-loading-issue.md` で実施された「StreamPhase 導入・要約イベントリアルタイム化」リファクタリングのコードレビュー中に発見されました。

### リスク評価

| 問題 | 発生頻度 | 影響度 | 対応緊急度 |
|------|---------|--------|-----------|
| 依存配列漏れ | 低 | 中 | 🔴 高 |
| error prop 欠落 | 中 | 中 | 🔴 高 |
| 不完全な判定 | 低 | 高 | 🔴 高 |
| メモリリーク | 低 | 低 | 🔴 高 |

### 関連ドキュメント

- [StreamPhase 導入レッスン](/docs/lessons/2026-02-26-chat-streaming-loading-issue.md)
- [useLLMStream 実装](/hooks/useLLMStream/index.ts)
- [FeatureChat 実装](/components/ui/FeatureChat.tsx)
