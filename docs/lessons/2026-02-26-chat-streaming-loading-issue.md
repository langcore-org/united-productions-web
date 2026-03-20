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

---

## 追加リファクタリング（2026-02-26）

初期修正の設計レビューで以下の問題が見つかり、中長期的に理想的なコードへと改善した。

### 発見された問題点

#### 問題1: `isPending` のリセット漏れリスク

初期修正では `isPending` と `isComplete` の **2つの独立したboolean** を手動で管理していた。

```typescript
// startStream 内の catch 処理（修正前）
if (err instanceof Error && err.name === "AbortError") {
  setIsComplete(true);
  // setIsPending(false) ← 漏れると isPending が true のまま残る
}
```

2つのステートが矛盾する「不可能な状態」（例: `isPending=true` かつ `isComplete=true`）が理論上あり得た。

#### 問題2: 要約処理中の状態が UI に届かない

`memory.addMessages(messages)` の中で要約処理が起きても、`SummarizationEvent` は処理完了後にまとめて取得されていた。`preparing` フェーズ中に「文脈を要約中...」をリアルタイム表示できていなかった。

#### 問題3: `SummarizationEvent` 型の重複定義

同じ interface が `client-memory.ts` と `hooks/useLLMStream/types.ts` の 2箇所に定義されていた。

---

### 実施した改善

#### 改善1: `StreamPhase` による単一ステート管理（案1+案2）

`isPending + isComplete` の2つのbooleanを廃止し、**単一の `StreamPhase` 型**に統一。

```typescript
// hooks/useLLMStream/types.ts
export type StreamPhase =
  | "idle"       // 初期状態・resetStream後
  | "preparing"  // memory前処理中（要約処理など）、LLMリクエスト準備中
  | "streaming"  // LLMからレスポンス受信中
  | "complete"   // 正常完了
  | "error"      // エラー終了
  | "cancelled"; // キャンセル
```

`isPending` と `isComplete` は **computed value（派生値）** として算出するように変更：

```typescript
// hooks/useLLMStream/index.ts
const [phase, setPhase] = useState<StreamPhase>("idle");

const isPending = phase === "preparing" || phase === "streaming";
const isComplete = !isPending;
```

これにより：
- 「不可能な状態」が構造的に存在できなくなる
- `error` や `cancelled` のパスで `setIsPending(false)` を忘れるバグが根本解消される
- `resetStream` 後は必ず `"idle"` に戻ることが保証される

ステート遷移図：
```
idle → preparing → streaming → complete
                ↘ error
                ↘ cancelled
(complete/error/cancelled) → idle  （resetStream時）
```

#### 改善2: `onSummarizationUpdate` コールバック（案3）

`ClientMemory` にコールバックオプションを追加し、要約処理の進捗を **リアルタイムで React ステートに反映**できるようにした。

```typescript
// lib/llm/memory/client-memory.ts
export interface ClientMemoryOptions extends BaseMemoryOptions {
  onSummarizationUpdate?: (event: SummarizationEvent) => void;
}
```

`ClientMemory.updateSummary()` 内部で 3 タイミングにコールバックを呼び出す：

| タイミング | `status` | `displayName` |
|-----------|----------|--------------|
| 要約API呼び出し直前 | `"running"` | `"文脈を要約中"` |
| 要約完了後 | `"completed"` | `"文脈を要約しました（N件）"` |
| 要約失敗時 | `"error"` | `"文脈の要約に失敗"` |

`useLLMStream` フック側では、同一 ID のイベントを upsert する `upsertSummarizationEvent` ヘルパーを追加：

```typescript
const upsertSummarizationEvent = useCallback((event: SummarizationEvent) => {
  setSummarizationEvents((prev) => {
    const existing = prev.findIndex((e) => e.id === event.id);
    if (existing >= 0) {
      const updated = [...prev];
      updated[existing] = event;
      return updated;
    }
    return [...prev, event];
  });
}, []);
```

`running` → `completed` の遷移が**同一 ID で通知**されるため、UI 側で「更新」として扱え、「追加」の重複が生じない。

#### 改善3: `SummarizationEvent` 型の正規化

型の重複定義を解消。正規定義を `lib/llm/memory/types.ts` に移動し、各ファイルはそこから re-export する構成に統一した。

```
lib/llm/memory/types.ts   ← 正規定義
    ↓
lib/llm/memory/client-memory.ts  → import from ./types
lib/llm/memory/index.ts          → re-export from ./types
    ↓
hooks/useLLMStream/types.ts  → re-export from @/lib/llm/memory/types
    ↓
components/chat/types.ts     → import from @/hooks/useLLMStream
```

#### 改善4: `isStreaming` エイリアスの削除

`FeatureChat.tsx` 内の `const isStreaming = isPending;` という冗長なエイリアスを削除し、`isPending` を直接使用するよう変更。

---

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `lib/llm/memory/types.ts` | `SummarizationEvent` 型を移動・正規定義 |
| `lib/llm/memory/client-memory.ts` | `onSummarizationUpdate` コールバック追加 |
| `lib/llm/memory/index.ts` | エクスポート元を `./types` に変更 |
| `hooks/useLLMStream/types.ts` | `StreamPhase` 型追加、`SummarizationEvent` を re-export に変更 |
| `hooks/useLLMStream/index.ts` | `phase: StreamPhase` による単一ステート管理、`upsertSummarizationEvent` 追加 |
| `components/ui/FeatureChat.tsx` | `isStreaming` エイリアス削除、`isPending` 直接使用 |

---

### 追加したテスト

**`tests/lib/llm/memory/client-memory.test.ts`**（4件追加）
- `running` イベントが要約開始時に通知される
- `error` イベントが要約失敗時に通知される
- コールバック未指定でもエラーなく動作する
- 同一 ID で `running` → `completed` の順に 2 回通知される（upsert 動作の保証）

**`tests/hooks/useLLMStream.test.ts`**（6件追加）
- 初期状態は `phase=idle, isPending=false, isComplete=true`
- 正常完了後は `phase=complete, isPending=false`
- エラー時は `phase=error, isPending=false`
- キャンセル時は `phase=cancelled, isPending=false`
- `resetStream` 後は `phase=idle` に戻る
- `isPending === !isComplete` が常に成立する（不変条件テスト）

全 32 テスト パス。

---

### 設計上の学び

**「不可能な状態を型で表現できなくする」**

複数の boolean ステートが矛盾する組み合わせをとれる設計は、バグの温床になる。
Elm や Rust で一般的な **discriminated union（直和型）** パターンで状態を一元管理することで、不正な状態遷移をコンパイル時に防げる。

**「副作用のある処理はコールバックで通知する」**

`await` でブロックする処理（外部 API 呼び出しなど）の内部状態を呼び出し元に届けるには、**コールバック渡し** が効果的。Promise の解決を待つだけでは、処理中の細かい状態変化が伝わらない。

**「型の正規定義は責任のある層に置く」**

`SummarizationEvent` は `ClientMemory` が発行するイベントであり、その型の正規定義は memory 層（`lib/llm/memory/types.ts`）が持つべき。上位層（hooks, components）は re-export のみとし、定義の重複を避ける。

---

## 関連ドキュメント

- [Lessons README](./README.md) - 知見一覧
- [Plans](../plans/) - 実装計画
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
