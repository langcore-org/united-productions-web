# チャット送信後の画面停滞問題 - 調査・修正レポート

> **発見日**: 2026-02-26  
> **修正日**: 2026-02-26  
> **関連ファイル**: 
> - `hooks/useLLMStream/index.ts`
> - `components/ui/FeatureChat.tsx`
> - `lib/llm/memory/client-memory.ts`

---

## 問題の概要

チャットでプロンプトを送信後、しばらく画面が何も動かない状態が続いていた。本来は「考え中...」やツール使用状況などの表示がすぐに出るべきだった。

### 再現手順
1. チャット画面でメッセージを入力
2. 送信ボタンをクリック
3. 画面が数秒間何も動かない
4. 最初のコンテンツが届くと suddenly 表示される

---

## 調査プロセス

### Step 1: 処理フローの理解

まずドキュメント `docs/specs/api-integration/system-prompt-generation.md` を参照し、処理フローを把握した：

```
FeatureChat.tsx → useLLMStream.ts → llm-client.ts → /api/llm/stream/route.ts → LLM API
```

### Step 2: 該当コードの確認

#### `FeatureChat.tsx`（212行目）
```typescript
const isStreaming = !isComplete && !!content;
```

この定義により、**最初の `content` が届くまで `isStreaming` は `false`** になる。

#### `FeatureChat.tsx`（308行目）
```typescript
{isStreaming && (
  <StreamingSteps ... />
)}
```

`isStreaming` が `false` の間、`StreamingSteps` コンポーネントが**まるごとレンダリングされない**。

#### `StreamingSteps.tsx`（83行目）
```typescript
{!hasAnyActivity && !isComplete && <ThinkingPlaceholderMessage provider={provider} />}
```

「考え中...」を表示するロジックは存在するが、`FeatureChat` 側で `StreamingSteps` を表示していないため機能していなかった。

### Step 3: 根本原因の特定

`useLLMStream/index.ts` の `startStream` 関数に問題があった：

```typescript
const startStream = useCallback(
  async (messages, provider, featureId, programId) => {
    cleanup();

    setIsComplete(false);  // ← ステート更新をリクエストするだけ（非同期）
    
    // ...
    
    await memory.addMessages(messages);  // ← ここで長時間ブロック！
    // ...
  }
);
```

**問題の流れ**：
1. `setIsComplete(false)` を呼んでも、React のステート更新は**非同期**
2. 次の `await memory.addMessages(messages)` で**即座にブロック**
3. React はレンダリングの機会を得られない → `isComplete` は `true` のまま
4. 結果：`FeatureChat.tsx` 側では `isComplete = true` の間、`isStreaming = false`

### Step 4: ClientMemory の処理時間の確認

`lib/llm/memory/client-memory.ts` を確認したところ、以下の処理が同期的に実行されることが判明：

- メッセージのトークン数見積もり
- 要約が必要かどうかの判定
- API 経由での要約実行（`await fetch("/api/llm/summarize")`）  
  → これが数秒かかる場合がある

---

## 修正内容

### 方針

`isComplete` だけでなく、**「準備中」状態を示す `isPending` を新たに導入**し、ストリーム開始直後から UI に反映させる。

### 修正箇所 1: `hooks/useLLMStream/index.ts`

```typescript
// 1. 新しいステートを追加
const [isPending, setIsPending] = useState(false);

// 2. startStream 開始直後に true に
const startStream = useCallback(async (...) => {
  cleanup();
  
  setIsPending(true);  // ← 即座に反映
  setContent("");
  setIsComplete(false);
  // ...
  
  await memory.addMessages(messages);  // ブロックしても isPending は true のまま
  // ...
}, [...]);

// 3. 完了・エラー時に false に
case "done":
  setUsage(event.usage);
  setIsComplete(true);
  setIsPending(false);  // ← 完了時にリセット
  // ...

if (err instanceof Error && err.name === "AbortError") {
  setIsComplete(true);
  setIsPending(false);  // ← エラー時もリセット
} else {
  // ...
  setIsComplete(true);
  setIsPending(false);  // ← エラー時もリセット
}

// 4. resetStream でもリセット
const resetStream = useCallback(() => {
  // ...
  setIsPending(false);
  // ...
}, [cleanup]);

// 5. フックの返り値に追加
return {
  // ...
  isPending,
  // ...
};
```

### 修正箇所 2: `components/ui/FeatureChat.tsx`

```typescript
// 1. isPending を取得
const { content, isComplete, isPending, ... } = useLLMStream();

// 2. isStreaming の定義を変更
const isStreaming = isPending;  // ← 修正前: !isComplete && !!content

// 3. 条件分岐を isPending ベースに変更
) : !hasMessages && !isPending ? (  // ← 修正前: !isStreaming

{isPending && (  // ← 修正前: isStreaming
  <StreamingSteps ... />
)}

{!isPending && hasMessages && lastAssistantMessage && (  // ← 修正前: !isStreaming
  <FollowUpSuggestions ... />
)}

{!isPending && ...}  // ← 修正前: !isStreaming
```

---

## 修正前後の動作比較

| タイミング | 修正前 | 修正後 |
|-----------|--------|--------|
| **送信直後** | 画面が動かない | 「考え中...」表示 |
| **Memory要約処理中** | 画面が動かない | 「文脈を要約中」表示 |
| **LLM応答待ち** | 画面が動かない | 「考え中...」表示 |
| **ツール使用中** | 即座に表示 | 即座に表示（変化なし）|
| **コンテンツ受信中** | 表示される | 表示される（変化なし）|
| **完了時** | フォローアップ表示 | フォローアップ表示（変化なし）|

---

## 技術的な学び

### 1. React のステート更新は非同期

```typescript
setIsComplete(false);
// ここではまだ isComplete は true のまま
await something();  // ブロックされると再レンダリングが発生しない
```

ステート更新は**バッチ処理**され、再レンダリングは同期的には発生しない。長時間の `await` でブロックされると、ステート変更が UI に反映されない。

### 2. ステート管理の設計

- `isComplete`: ストリームが完了したか（true = 完了）
- `isPending`: 処理中か（true = 準備中またはストリーミング中）

このように**独立したステート**を持たせることで、より細かい制御が可能になる。

### 3. ブロッキング処理の可視化

長時間かかる可能性のある処理（`await memory.addMessages(messages)`）は、
必ず**ステート変更を先行させて**から実行するか、
**別のステート**でその期間をカバーする必要がある。

---

## 関連する今後の改善案

### 要約処理の非同期化（オプション）

現在 `await memory.addMessages(messages)` で要約処理を待っているが、
これを非同期化し、「要約中」表示を独立したステップとして扱うことも検討できる：

```typescript
// 案: 要約を非同期で実行
memory.addMessages(messages).then(() => {
  setSummarizationEvents(memory.getSummarizationHistory());
});
// 即座にストリーミング開始
startStreaming();
```

ただし、要約結果が LLM リクエストに反映される前にストリームが始まるため、
慎重な設計が必要。

---

## 検証方法

1. チャット画面を開く
2. メッセージを送信
3. **送信直後に「考え中...」が表示されることを確認**
4. 長い会話履歴がある場合は「文脈を要約中」が表示されることを確認
5. ツール使用時はツール名が表示されることを確認
6. 応答が返ってきたらコンテンツが正常に表示されることを確認
