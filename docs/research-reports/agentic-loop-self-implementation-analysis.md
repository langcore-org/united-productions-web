# エージェントループ自前実装のメリット・デメリット分析

> 作成日: 2026-03-20
> 対象: Teddyプロジェクトのエージェント化検討

---

## 概要

エージェントループ（tool_calls検出→実行→再リクエスト）を**自前で実装すること**と、**フレームワークに任せること**の違いを分析します。

```
【エージェントループの流れ】

ユーザー入力
    ↓
LLM API呼び出し（tools指定）
    ↓
レスポンス解析
    ├── テキスト出力 → ユーザーに返す
    └── tool_calls検出 → ツール実行
            ↓
    ツール結果をメッセージに追加
            ↓
    再度LLM API呼び出し（ループ）
            ↓
    最終応答をユーザーに返す
```

---

## 1. 自前実装のメリット

### 1.1 完全な制御性

| 制御項目 | フレームワーク使用 | 自前実装 |
|---------|------------------|---------|
| **ループ回数上限** | `maxSteps: 20`等、フレームワークの制約に依存 | **任意に設定可能**（5回、10回、無制限など） |
| **タイムアウト** | フレームワーク依存 | **精密に制御可能**（ツール毎、全体など） |
| **エラーハンドリング** | フレームワーク任せ | **詳細な制御可能**（リトライ回数、フォールバックなど） |
| **ログ・監視** | 限定的 | **自由に実装可能**（独自メトリクス、詳細ログ） |

```typescript
// 自前実装例：詳細な制御
async function* agentStream(messages: Message[], options: {
  maxTurns: number;        // ← 自由に設定
  toolTimeoutMs: number;   // ← ツール毎のタイムアウト
  globalTimeoutMs: number; // ← 全体のタイムアウト
  retryCount: number;      // ← リトライ回数
  onToolStart?: (tool: string) => void;  // ← フック
  onToolEnd?: (tool: string, duration: number) => void;
} = {}) {
  const startTime = Date.now();
  
  for (let turn = 0; turn < options.maxTurns; turn++) {
    // 全体タイムアウトチェック
    if (Date.now() - startTime > options.globalTimeoutMs) {
      throw new Error('Global timeout exceeded');
    }
    
    // ... 実装
  }
}
```

### 1.2 RAG + Web検索の統合が可能

**フレームワーク（Vercel AI SDK）の制限**:
```typescript
// ❌ これは動作しない
const result = streamText({
  model: xai.responses('grok-4-1-fast-reasoning'),
  tools: {
    web_search: xai.tools.webSearch(),  // server-side（フレームワーク管理）
    rag_search: tool({ execute: async () => {} })  // client-side（自前）
    // ↑ 混在不可！
  }
});
```

**自前実装**:
```typescript
// ✅ 混在可能
const tools = [
  { type: 'web_search' },  // server-side: xAI自動実行
  { type: 'x_search' },    // server-side: xAI自動実行
  {
    type: 'function',      // client-side: 自前実装
    function: {
      name: 'rag_search',
      execute: async ({ query }) => {
        return await hybridSearch(query);  // ← RAG検索
      }
    }
  }
];

// ループ内で両方を処理
for (const event of stream) {
  if (event.type === 'web_search_call') {
    // xAIが自動実行 → 結果を待つ
  }
  if (event.type === 'function_call' && event.name === 'rag_search') {
    // 自前でRAG実行 → 結果を追加
    const results = await hybridSearch(event.arguments.query);
    messages.push({ role: 'tool', content: JSON.stringify(results) });
  }
}
```

### 1.3 シンプルさ（Teddy規模には最適）

| 項目 | LangGraph | Vercel AI SDK | 自前実装 |
|------|-----------|--------------|---------|
| **依存パッケージ** | 多い（@langchain/langgraph, @langchain/core等） | 中（ai, @ai-sdk/xai等） | **少ない（openaiのみ）** |
| **抽象化レイヤー** | 多い（StateGraph, Node, Edge等） | 中（ToolLoopAgent等） | **なし（生のAPI）** |
| **学習コスト** | 高（Graph概念、DSL） | 中（SDK API） | **低（標準的なHTTP）** |
| **コード行数（同等機能）** | 100行程度 | 50行程度 | **80行程度** |

**Teddy規模（単一アプリ、特定ユースケース）では、自前実装の方がシンプル**:
- Graphの概念が不要
- 状態管理がシンプル（変数のみ）
- デバッグが容易（抽象化レイヤーがない）

### 1.4 パフォーマンス

| 項目 | フレームワーク | 自前実装 |
|------|--------------|---------|
| **オーバーヘッド** | フレームワークの処理分遅い | **最小限** |
| **メモリ使用量** | フレームワークの状態管理分多い | **最適化可能** |
| **コールドスタート** | フレームワーク初期化分遅い | **速い** |

LangGraphの場合、直接LLM比で**2-5倍遅い**という報告あり（xAI API調査）。

### 1.5 デバッグの容易さ

```typescript
// 自前実装：どこで何が起きているか明確
console.log(`[Turn ${turn}] Calling LLM with ${messages.length} messages`);
console.log(`[Turn ${turn}] Tools: ${tools.map(t => t.name).join(', ')}`);

for await (const event of stream) {
  console.log(`[Event] Type: ${event.type}`);
  
  if (event.type === 'function_call') {
    console.log(`[Tool Call] ${event.name} with args: ${event.arguments}`);
    // ブレークポイントで停止可能
  }
}
```

フレームワークでは抽象化レイヤーの内側で処理されるため、デバッグが困難。

---

## 2. 自前実装のデメリット

### 2.1 初期実装工数

| タスク | フレームワーク使用 | 自前実装 |
|--------|------------------|---------|
| 基本実装 | 数時間 | 1-2日 |
| エラーハンドリング | フレームワーク任せ | 自前で実装必要 |
| ストリーミング対応 | 抽象化済み | 生SSE処理必要 |
| 再試行ロジック | 組み込み | 自前実装必要 |
| **合計工数** | **数日** | **3-7日** |

**ただし、Teddyの場合**:
- 既存の`GrokClient`実装があるため、拡張形で実装可能
- 実質的な工数は**2日程度**で済む見込み

### 2.2 保守・運用の責任

```
【責任の所在】

フレームワーク使用:
  バグ → フレームワークのIssue報告 → コミュニティ/メンテナー修正待ち
  セキュリティパッチ → フレームワーク更新 → 依存関係更新

自前実装:
  バグ → 自分で修正
  セキュリティパッチ → 自分で適用
  新機能 → 自分で実装
```

**長期的な保守コスト**:
- フレームワーク: 更新対応が必要（破壊的変更に注意）
- 自前実装: 自分でメンテナンス（ただし、OpenAI SDKは標準的で安定）

### 2.3 標準機能の再実装

フレームワークに含まれる標準機能を自前で実装する必要あり：

| 機能 | フレームワーク | 自前実装 |
|------|--------------|---------|
| **リトライ機構** | 組み込み | 自前実装必要 |
| **指数バックオフ** | 組み込み | 自前実装必要 |
| **タイムアウト制御** | 組み込み | 自前実装必要 |
| **並列ツール実行** | 組み込み | 自前実装必要 |
| **レート制限対応** | 組み込み | 自前実装必要 |

```typescript
// 自前実装：リトライ機構
async function callWithRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; backoffMs: number }
): Promise<T> {
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === options.maxRetries - 1) throw error;
      await sleep(options.backoffMs * Math.pow(2, i)); // 指数バックオフ
    }
  }
  throw new Error('Unreachable');
}
```

### 2.4 ベストプラクティスの知見

フレームワークには、コミュニティの知見が詰まっている：
- エッジケースのハンドリング
- パフォーマンス最適化
- セキュリティ対策

自前実装では、これらを自分で学習・実装する必要がある。

---

## 3. Teddyプロジェクト特有の検討

### 3.1 自前実装が適している理由

| 項目 | Teddyの状況 | 評価 |
|------|------------|------|
| **スケール** | 単一アプリ、特定ユースケース | ◎ 自前実装で十分 |
| **複雑性** | リサーチ、チャット、議事録等の特定機能 | ◎ シンプルなループで対応可能 |
| **既存資産** | `GrokClient`実装あり | ◎ 拡張形で実装可能 |
| **RAG要件** | 社内資料検索が必須 | ◎ フレームワークでは不可 |
| **チームサイズ** | 小規模 | ◎ フレームワークの学習コスト不要 |

### 3.2 フレームワークが過剰となる理由

LangGraphのような強力なフレームワークは、以下のような場合に真価を発揮：
- 複雑な分岐ロジック（条件付きエッジ）
- 長期間にわたる会話の永続化
- 人間介入（Human-in-the-Loop）
- サブエージェントの並列実行

**Teddyのユースケース**:
- 比較的シンプルなリサーチフロー
- 同期的なチャット応答
- 複雑な分岐なし

→ **フレームワークの機能の大部分が不要**

---

## 4. 結論

### メリットが上回るケース

自前実装を選ぶべきケース：
- ✅ **RAG + Web検索の統合が必要**
- ✅ 特定の制御（タイムアウト、リトライ）が必要
- ✅ シンプルなユースケース（複雑な分岐なし）
- ✅ フレームワークの学習コストを避けたい
- ✅ デバッグの容易さを重視

### フレームワークを選ぶべきケース

フレームワーク使用を選ぶべきケース：
- ✅ 複雑なエージェントワークフロー（分岐、並列）
- ✅ 長期間の会話永続化が必要
- ✅ 人間介入（HIL）が必要
- ✅ マルチプロバイダー対応が必要
- ✅ 観測性（Observability）が重要

### Teddyへの推奨

```
┌─────────────────────────────────────────────────────────────┐
│                    Teddyへの推奨：自前実装                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  理由1: RAG統合が必須で、フレームワークでは実現不可            │
│  理由2: ユースケースがシンプルで、フレームワークは過剰         │
│  理由3: 既存GrokClientがあり、拡張形で実装可能                 │
│  理由4: デバッグ・制御の容易さを重視できる                     │
│                                                             │
│  実装工数: 2日程度（既存実装の拡張）                          │
│  長期的保守: シンプルなコードベースで管理しやすい               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
