# エージェントループ自前実装のメリット・デメリット分析

> 作成日: 2026-03-20
> 最終更新: 2026-03-22
> 対象: Teddyプロジェクトのエージェント化検討
> 
> **関連文書**:
> - [エージェントアーキテクチャ & RAG戦略](./agentic-architecture-and-rag-strategy.md) — RAG基盤設計、embedding選定、hybrid_search設計
> - [実装計画](../plans/agentic-loop-implementation.md) — 確定した実装フェーズとタスク一覧

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

LangGraphの主要機能とTeddyの実際のユースケースを1対1で対比する。

#### LangGraphの機能 vs Teddyの実態

| LangGraphの機能 | 想定ユースケース | Teddyの実態 | 必要性 |
|----------------|----------------|------------|--------|
| **StateGraph（条件付きエッジ）** | 複雑な分岐ワークフロー | 全5機能とも「入力→LLM→応答」の直線フロー | ❌ 不要 |
| **Checkpointing（状態永続化）** | 長時間タスクの中断・再開 | 1リクエストで完結、チャット履歴はSupabaseで管理済み | ❌ 不要 |
| **Human-in-the-Loop** | LLM判断の途中承認 | ユーザーは入力→応答を受け取るだけ、途中承認なし | ❌ 不要 |
| **サブグラフ（並列エージェント）** | 複数エージェントの協調 | 単一のGrokClientが全機能を処理 | ❌ 不要 |
| **ToolNode（ツール実行ノード）** | カスタムツールのグラフ統合 | xAIのserver-sideツール（web_search等）で完結 | ❌ 不要 |
| **MessageGraph** | メッセージ単位の状態管理 | `LLMMessage[]`配列で十分 | ❌ 不要 |

#### Teddyの全5機能は同一パターン

```
【全機能共通のフロー】

ユーザー入力
    ↓
systemPrompt設定（DBから取得、機能ごとに異なる）
    ↓
GrokClient.streamChat(messages, tools)
    ├── web_search / x_search → xAI server-side自動実行
    └── テキスト生成 → SSEでストリーミング返却
    ↓
チャット履歴をSupabaseに保存
```

各機能の違いはsystemPromptの内容のみで、**処理フロー自体は完全に同一**:

| 機能 | systemPrompt | ツール | フロー |
|------|-------------|-------|--------|
| `general-chat` | 汎用チャット指示 | web_search, x_search | 直線 |
| `research-cast` | 出演者リサーチ指示 | web_search, x_search | 直線 |
| `research-evidence` | エビデンス検証指示 | web_search, x_search | 直線 |
| `minutes` | 議事録作成指示 | なし | 直線 |
| `proposal` | 企画立案指示 | web_search, x_search | 直線 |

#### LangGraphで同じものを書いた場合の過剰さ

```typescript
// ❌ LangGraph: Teddyには過剰な抽象化
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

const graph = new StateGraph(MessagesAnnotation)
  .addNode("chat", async (state) => {
    // ← 1ノードしかないのにGraph
    return { messages: [await model.invoke(state.messages)] };
  })
  .addEdge("__start__", "chat")  // ← 直線なのにエッジ定義
  .addEdge("chat", "__end__");   // ← 分岐なし

const app = graph.compile({
  checkpointer: new MemorySaver(),  // ← Supabaseで管理済みなのに二重管理
});
```

```typescript
// ✅ 自前実装: Teddyの実態に合ったシンプルさ
const grok = createLLMClient("grok-4-1-fast-reasoning");
const stream = grok.streamChat(messages, {
  systemPrompt: config.systemPrompt,
  tools: ["web_search", "x_search"],
});
```

#### 将来RAGを追加した場合でも直線フロー

エージェントループを導入してRAG検索を追加しても、フローは「ツールが増えるだけ」で分岐は発生しない:

```
ユーザー入力
    ↓
LLM呼び出し（tools: [web_search, x_search, rag_search]）
    ↓
tool_calls検出 → 各ツール実行 → 結果を追加 → 再度LLM呼び出し
    ↓                                              ↓
（ループ）                                    最終応答を返す
```

→ 現状の機能セットでは直線フローで完結するが、**機能の質を高めるために分岐やHITLを導入する余地がある**（後述 3.3）。

### 3.3 発展的ユースケース: 分岐ワークフローとHITLの可能性

現在の全5機能は直線フローだが、これは「現状の実装がそうである」だけで、**分岐やHITLを導入すれば各機能の品質を大幅に向上できる**。

#### 各機能への適用シナリオ

**1. エビデンスリサーチ（research-evidence）— 分岐が最も有効**

```
【現状】直線フロー
ユーザー: 「〇〇は本当か？」
    → LLM + web_search → 1回の検索で回答

【改善案】品質判定による分岐
ユーザー: 「〇〇は本当か？」
    → LLM: 検索戦略を立案（一般Web / 学術 / 公的機関）
    → web_search実行
    → LLM: 結果の信頼性を自己評価
        ├── 十分 → 最終回答を生成
        └── 不十分 → 別の検索クエリで再検索（最大3回）
                   → 矛盾する情報あり → 両論併記で回答
```

効果: 1回の検索で「わかりませんでした」と返すケースが減り、裏付けの厚い回答を生成できる。

**2. 出演者リサーチ（research-cast）— HITL が有効**

```
【現状】直線フロー
ユーザー: 「健康企画に合う出演者を探して」
    → LLM + web_search → 候補リストを一括生成

【改善案】段階的リサーチ + ユーザー選択
ユーザー: 「健康企画に合う出演者を探して」
    → LLM: 候補カテゴリ提示（医師/タレント/アスリート/インフルエンサー）
    → [HITL] ユーザー: 「医師とタレントで」
    → LLM: 各カテゴリで候補を検索
    → 候補5名の概要を提示
    → [HITL] ユーザー: 「この2人を深掘りして」
    → LLM: 選択された候補の詳細プロフィール・出演歴を調査
    → 最終レポート
```

効果: ユーザーの意図を段階的に反映でき、不要な候補の深掘りを避けられる。

**3. 新企画立案（proposal）— 分岐 + HITL の組み合わせ**

```
【現状】直線フロー
ユーザー: 「20代向けロケ企画を考えて」
    → LLM → 企画案を一括生成

【改善案】発散→収束フロー
ユーザー: 「20代向けロケ企画を考えて」
    → LLM: 方向性を3つ提示（体験型 / SNS連動型 / ドキュメント型）
    → [HITL] ユーザー: 「体験型で」
    → LLM + web_search: 類似企画の成功事例を調査
    → LLM: 具体案を3つ生成
        → 各案の実現可能性を自己評価（分岐）
            ├── 予算・ロケ地の情報が不足 → 追加検索
            └── 十分 → 実現性スコア付きで提示
    → [HITL] ユーザー: 「案2を詳細化して」
    → 最終企画書
```

**4. 議事録作成（minutes）— 分岐が有効**

```
【現状】直線フロー
文字起こしテキスト → LLM → 議事録

【改善案】品質チェック分岐
文字起こしテキスト
    → LLM: 議事録を生成
    → LLM: 自己レビュー（発言者の取り違え、決定事項の漏れ）
        ├── 問題なし → 最終出力
        └── 不明点あり → 該当箇所をハイライトして出力
            → [HITL] ユーザー: 「ここは田中さんの発言です」
            → 修正版を生成
```

#### 自前実装でも分岐・HITLは実現可能

重要なのは、**これらのパターンはLangGraphなしでも実装できる**という点:

```typescript
// 自前実装での分岐: if文とループで表現可能
async function* researchWithRetry(query: string, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await grok.chat([
      { role: "system", content: EVIDENCE_PROMPT },
      { role: "user", content: query },
    ]);

    const quality = await evaluateQuality(result);  // LLMによる自己評価
    if (quality.sufficient) {
      yield { type: "final", content: result.content };
      return;
    }

    // 不十分 → 検索戦略を変更して再試行
    query = quality.refinedQuery;
    yield { type: "progress", message: `検索を深掘り中（${attempt + 1}/${maxAttempts}）` };
  }
}

// 自前実装でのHITL: ストリーミング中断 + ユーザー入力待ち
async function* researchWithHITL(query: string) {
  const candidates = await searchCandidates(query);

  // 中間結果をユーザーに提示して選択を待つ
  yield {
    type: "awaiting_input",
    message: "以下の候補が見つかりました。深掘りしたい候補を選んでください。",
    options: candidates.map(c => c.name),
  };
  // → UIからユーザーの選択を受け取り、次のリクエストで続行
}
```

```typescript
// LangGraphで同じことを書いた場合
const graph = new StateGraph(ResearchAnnotation)
  .addNode("search", searchNode)
  .addNode("evaluate", evaluateNode)
  .addNode("ask_user", askUserNode)      // HITL
  .addNode("deep_dive", deepDiveNode)
  .addConditionalEdges("evaluate", qualityRouter, {
    sufficient: "final",
    insufficient: "search",              // 再検索
  })
  .addEdge("search", "evaluate")
  .addEdge("ask_user", "deep_dive")      // ユーザー選択後
  .addEdge("deep_dive", "__end__")
  .compile({ checkpointer: new MemorySaver() });

// ↑ 4ノード程度の分岐をGraph DSLで記述する必要があるか？
//   if文 + forループで十分に表現できる複雑度。
```

#### 判断基準: いつフレームワークが本当に必要になるか

| 複雑度 | 具体例 | 推奨 |
|--------|--------|------|
| **分岐1-2個 + ループ** | エビデンスの品質チェック再検索 | ✅ 自前実装で十分 |
| **HITL 1箇所** | 候補選択の確認 | ✅ 自前実装で十分 |
| **分岐3個以上 + HITL + 並列** | 複数エージェントが協調して調査 | ⚠️ フレームワーク検討の価値あり |
| **動的なサブグラフ生成** | ユーザー入力に応じてワークフロー自体が変化 | ✅ フレームワーク推奨 |

Teddyの発展的ユースケースは上2つに該当し、**if文 + ループ + ストリーミング中断で十分に実装可能な範囲**。

### 3.4 `ask_user` ツールの設計

3.3で議論したHITLを実現するための具体的な手段として、エージェントループに `ask_user` ツールを組み込む設計を検討する。

#### 基本的な仕組み

`ask_user` は `web_search` や `rag_search` と同列のツールとしてLLMに定義する。LLMが「ここでユーザーに確認が必要」と判断したタイミングで自律的に呼び出す。

```typescript
const tools = [
  { type: "web_search" },     // xAI server-side
  { type: "x_search" },       // xAI server-side
  {
    type: "function",
    function: {
      name: "rag_search",     // 自前実装: RAG検索
      parameters: { query: { type: "string" } },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_user",       // 自前実装: ユーザーへの質問
      description: "調査の方向性を確認したい時や、候補を絞り込むためにユーザーの選択が必要な時に使用する。",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "ユーザーへの質問文",
          },
          options: {
            type: "array",
            items: { type: "string" },
            description: "選択肢（省略時は自由入力）",
          },
          context: {
            type: "string",
            description: "質問の背景（なぜ確認が必要か）",
          },
        },
        required: ["question"],
      },
    },
  },
];
```

#### 実装アプローチの比較

| アプローチ | 概要 | 複雑度 | Teddy適合度 |
|-----------|------|--------|------------|
| **A. ストリーム終了方式** | `ask_user` 呼び出し時にストリームを終了し、ユーザー応答を新しいターンとして処理 | 低 | ◎ |
| **B. 一時停止・再開方式** | エージェントの状態をシリアライズして中断、応答後にデシリアライズして再開 | 高 | △ |

**Teddy推奨: A. ストリーム終了方式**

理由: Teddyは既にチャット履歴をSupabaseに保存しており、各APIコールはステートレス。メッセージ履歴からコンテキストが復元されるため、複雑な状態管理は不要。

```
【ストリーム終了方式のフロー】

Turn 1:
  ユーザー: 「健康企画に合う出演者を探して」
  LLM: web_searchでリサーチ実行
  LLM: ask_user({ question: "以下のカテゴリから...", options: [...] })
  → ストリーム終了、UIに質問を表示

  messages履歴:
    [user] 健康企画に合う出演者を探して
    [assistant] {tool_call: web_search} → {result: ...}
    [assistant] {tool_call: ask_user} → question表示

Turn 2:
  ユーザー: 「医師とタレントで」  ← ユーザーの回答が新しいuserメッセージ
  LLM: 履歴から前回の調査コンテキストを理解し、続行
  LLM: 深掘り調査 → 最終レポート生成
```

#### エージェントループでの処理

```typescript
async function* agentLoop(messages: LLMMessage[], tools: Tool[]) {
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await grok.chat(messages, { tools });

    for (const toolCall of response.toolCalls ?? []) {
      if (toolCall.name === "ask_user") {
        // ask_user: ストリームを終了してUIに返す
        const { question, options, context } = JSON.parse(toolCall.arguments);
        yield {
          type: "ask_user",
          question,
          options,
          context,
        };
        return; // ← ループ終了。ユーザーの応答は次のAPIコールで処理される
      }

      // 他のツール（rag_search等）: 結果を追加してループ継続
      const result = await executeLocalTool(toolCall);
      messages.push({ role: "tool", content: JSON.stringify(result) });
    }

    if (!response.toolCalls?.length) {
      yield { type: "final", content: response.content };
      return;
    }
  }
}
```

#### UI側の処理

```typescript
// チャットUIでの ask_user イベント処理
function handleStreamEvent(event: AgentEvent) {
  switch (event.type) {
    case "ask_user":
      // 質問カードを表示（選択肢ボタン or 自由入力フィールド）
      setChatState({
        status: "awaiting_input",
        question: event.question,
        options: event.options,  // あれば選択肢ボタンを表示
      });
      break;
    case "final":
      // 通常の回答表示
      appendMessage({ role: "assistant", content: event.content });
      break;
  }
}

// ユーザーの回答 → 通常のメッセージ送信と同じ経路で送信
function handleUserAnswer(answer: string) {
  sendMessage(answer); // 既存のチャット送信と同じ
}
```

#### メリット・デメリット

| 観点 | メリット | デメリット |
|------|---------|-----------|
| **自律性** | LLMが自分で「ここは聞くべき」と判断する | 不要な質問をする可能性（プロンプトで制御） |
| **UX** | 対話的で、ユーザーの意図を段階的に反映 | 質問が多すぎると煩わしい |
| **実装コスト** | 既存のtool_call処理パターンに乗る | UI側に質問カードコンポーネントが必要 |
| **トークンコスト** | — | 各ask_userで1往復分のLLM呼び出しが追加 |
| **精度** | 曖昧なリクエストの精度が大幅に向上 | 明確なリクエストでは無駄な質問になりうる |

#### 過剰な質問を防ぐ制御

`ask_user` を導入する場合、LLMが不必要に質問しすぎる問題をプロンプトで制御する:

```
【ask_userの使用ルール（systemPromptに含める）】

ask_userツールは以下の場合にのみ使用すること：
- ユーザーの意図が曖昧で、調査の方向性が2つ以上に分かれる場合
- 候補が多数あり、絞り込みにユーザーの判断が必要な場合
- 調査結果に矛盾があり、どちらを重視するかの判断が必要な場合

以下の場合は使用しないこと：
- 自分で判断できる場合（まず自力で調査を試みる）
- 1回のask_userで得られる情報が調査品質に大きく影響しない場合
- 既にユーザーが十分な指示を提供している場合

1回のタスクでask_userを使用する回数は最大2回とする。
```

#### 導入判断

| 基準 | 評価 |
|------|------|
| 技術的に実装可能か | ✅ 既存のtool_call処理の延長で実装可能 |
| 既存アーキテクチャとの整合性 | ✅ ストリーム終了方式なら既存のステートレス設計と矛盾しない |
| ユーザー体験の向上 | ✅ 特にresearch-cast、proposalで大きな改善 |
| 実装工数 | エージェントループ本体 +0.5日程度（UIの質問カード含む） |
| 導入リスク | 低（ask_userを使わなければ従来通り動作する） |

→ **導入を推奨。** エージェントループと同時に実装するのが自然。ask_userはオプショナルなツールなので、LLMが不要と判断すれば従来通りの直線フローで動作し、リスクが低い。

---

## 4. 結論

### メリットが上回るケース

自前実装を選ぶべきケース：
- ✅ **RAG + Web検索の統合が必要**
- ✅ 特定の制御（タイムアウト、リトライ）が必要
- ✅ 分岐・HITLが少数で、if文+ループで表現可能
- ✅ フレームワークの学習コストを避けたい
- ✅ デバッグの容易さを重視

### フレームワークを選ぶべきケース

フレームワーク使用を選ぶべきケース：
- ✅ 分岐3個以上・並列実行を含む複雑なワークフロー
- ✅ ワークフロー自体が動的に変化する
- ✅ 長期間の会話永続化（数時間〜数日にわたるタスク）
- ✅ マルチプロバイダー対応が必要
- ✅ 観測性（Observability）が重要

### Teddyへの推奨

```
┌─────────────────────────────────────────────────────────────┐
│                    Teddyへの推奨：自前実装                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  理由1: RAG統合が必須で、フレームワークでは実現不可            │
│  理由2: 発展的ユースケース（分岐・HITL）も自前で実装可能       │
│  理由3: 既存GrokClientがあり、拡張形で実装可能                 │
│  理由4: デバッグ・制御の容易さを重視できる                     │
│                                                             │
│  実装工数: 2日程度（既存実装の拡張）                          │
│  発展的機能の追加工数: 機能あたり +0.5〜1日                   │
│  長期的保守: シンプルなコードベースで管理しやすい               │
│                                                             │
│  再評価トリガー:                                              │
│    - 分岐が3箇所を超えるワークフローが必要になった時            │
│    - 複数エージェントの並列協調が必要になった時                 │
│    - ワークフローの動的生成が必要になった時                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. ツール実行方式の選定調査（2026-03-22）

server-sideツール（xAI自動実行）とclient-sideツール（自前実行）を混在させるハイブリッド方式が最善かを検証した。

### 5.1 3つの選択肢

| 方式 | 概要 |
|------|------|
| **A. ハイブリッド** | server-side（web_search, x_search）+ client-side（ask_user, rag_search）を1リクエストで混在 |
| **B. 全部client-side** | built-inツールを使わず、web検索・X検索も自前のfunction callingで実装 |
| **C. 2フェーズ分離** | Phase 1でserver-sideのみ（検索）、Phase 2でclient-sideのみ（ask_user等） |

### 5.2 比較

| 観点 | A. ハイブリッド | B. 全部client-side | C. 2フェーズ分離 |
|------|---------------|-------------------|-----------------|
| **検索品質** | xAI最適化済み | 自前再実装で劣化 | xAI最適化済み |
| **LLMの判断** | 1回の思考で全ツール選択 | 同左 | フェーズ分断で文脈が切れる |
| **API呼び出し回数** | 少ない（1回で完結しうる） | ツール毎に往復 | 最低2回固定 |
| **コスト** | 最小 | ツール実行分のAPIが追加 | 2回分のinputトークン |
| **実装の複雑さ** | SSEで2種類のイベント処理 | 全部同じパターン | シンプルだが結合が面倒 |
| **自然な対話フロー** | 検索→ask_user→再検索が1フローで可能 | 同左 | 検索→ask_userの交互が不自然 |
| **xAI公式サポート** | ✅ Advanced Usageに完全な実装例あり | ✅ function callingのみ | ✅ だが推奨パターンではない |

### 5.3 xAI公式のハイブリッドサポート状況

xAIのAdvanced Usageドキュメント（docs.x.ai/developers/tools/advanced-usage）に、ハイブリッドの完全なツールループ実装例がある:

```
混在時の動作フロー（xAI公式仕様）:

1. server-side + client-sideツールを含めてリクエスト
2. xAIがserver-sideツール（web_search等）を自動実行
3. LLMがclient-sideツール（ask_user等）を呼びたい場合:
   → 実行を一時停止し、function_callをレスポンスに含めて返す
4. 開発者がfunction_callを検出・実行し、結果を追加して再リクエスト
5. LLMが最終応答を生成するまで繰り返し
```

**`max_turns`の挙動**: client-sideツール呼び出しが「チェックポイント」として機能し、ターンカウンタがリセットされる。つまり `max_turns=5` を設定しても、client-sideツール呼び出し後の再リクエストでは新たに5ターン使える。

**ストリーミング時のfunction_call**: 1チャンクで完結して返る（分割されない）。SSE処理は既存のイベント処理に`function_call`型の検出を足すだけで対応可能。

### 5.4 コミュニティの問題報告と影響

| 報告内容 | 原因 | Teddyへの影響 |
|---------|------|--------------|
| Vercel AI SDKで`x_search_call`等の未定義イベント型がZodError（vercel/ai #11025） | Vercel AI SDKのスキーマ未対応 | ❌ 影響なし（`fetch()`直接のため） |
| Vercel AI SDKでprovider-defined toolsが使えない（vercel/ai #11492） | SDK側の未実装 | ❌ 影響なし |
| tool-resultイベント欠落でUIがstuck（vercel/ai #13218） | SDK側のイベント処理バグ | ❌ 影響なし |
| xAI公式SDKが「buggy」でOpenAI SDKを推奨（コミュニティ報告） | xAI SDK品質 | ❌ 影響なし（SDKを使わない） |
| レート制限が公称値と乖離（480→200-300 req/min） | xAI API全般 | ⚠️ ハイブリッド固有ではないが要注意 |

**報告されている問題はすべてSDK経由の利用で発生しており、`fetch()`直接呼び出しでは影響を受けない。**

### 5.5 結論: A. ハイブリッド方式が最善

| 判断理由 | 詳細 |
|---------|------|
| **xAI APIがハイブリッドを前提に設計** | Advanced Usageに完全な実装例、`max_turns`チェックポイント仕様 |
| **検索品質を維持** | xAI最適化のweb_search/x_searchをそのまま利用 |
| **自然な対話フロー** | 検索→ask_user→再検索が途切れない |
| **SDK問題の回避** | `fetch()`直接のため、Vercel AI SDK/xAI SDKのバグに影響されない |
| **B案は劣化** | web_search/x_searchの再実装が必要、品質・工数ともに不利 |
| **C案は不自然** | 検索とask_userの交互実行ができず、ユースケースが制限される |

---

## 6. HTTPクライアント層の選定調査（2026-03-22）

エージェントループを自前実装するとして、HTTP通信・SSEパースの層にOpenAI SDKを使うべきかを調査した。

### 6.1 調査結果: OpenAI SDKのxAI互換性

xAI公式ドキュメントにて、**OpenAI JS SDKでResponses API + server-sideツール + Function Callingが動作する**ことが確認済み:

```typescript
// xAI公式ドキュメント掲載のJavaScriptコード（docs.x.ai/docs/guides/tools/overview）
import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const stream = await client.responses.create({
  model: "grok-4.20-reasoning",
  input: [{ role: "user", content: "..." }],
  tools: [
    { type: "web_search" },     // Built-in: xAI server-side
    { type: "x_search" },       // Built-in: xAI server-side
    { type: "function", name: "ask_user", ... },  // Custom: ローカル実行
  ],
  stream: true,
});
```

さらに、Function Calling後の会話継続に `previous_response_id` が使える:

```typescript
// ツール結果を返して会話を継続（docs.x.ai/developers/tools/function-calling）
response = await client.responses.create({
  model: "grok-4.20-reasoning",
  input: [{ type: "function_call_output", call_id: item.call_id, output: result }],
  tools: tools,
  previous_response_id: response.id,  // ← サーバー側で会話を管理
});
```

### 6.2 3つの選択肢の比較

| 項目 | A. 全部自前（現行） | B. OpenAI SDK + 自前ループ | C. OpenAI SDK + previous_response_id |
|------|---------------------|--------------------------|--------------------------------------|
| **HTTP/SSEパース** | `fetch()` + 手動（約100行） | SDK自動 | SDK自動 |
| **型定義** | 自前（XAIResponse等、約50行） | SDK提供 + xAI固有は型拡張 | 同左 |
| **リトライ/タイムアウト** | 自前実装 | SDK組み込み | SDK組み込み |
| **エージェントループ** | 自前while loop | 自前while loop | SDK機能（`previous_response_id`）活用 |
| **xAI固有イベント** | ✅ 完全対応 | ⚠️ `x_search_call`, `cost_in_usd_ticks` は型拡張が必要 | ⚠️ 同左 |
| **状態管理** | Supabase一元管理 | Supabase一元管理 | ⚠️ xAIサーバー + Supabaseの二重管理 |
| **移行コスト** | なし（現行コード維持） | GrokClient書き換え（中） | GrokClient + API層書き換え（大） |
| **新規依存** | なし | `openai` パッケージ追加 | 同左 |

### 6.3 xAI固有で OpenAI SDK型に含まれない機能

現在のGrokClientが利用しているxAI固有機能:

| 機能 | 用途 | OpenAI SDK |
|------|------|-----------|
| `x_search_call` イベント | X検索のツール実行表示 | ❌ 型なし（`web_search_call`はある） |
| `cost_in_usd_ticks` | xAI独自のコスト計算 | ❌ 型なし |
| `server_side_tool_usage_details.x_search_calls` | ツール使用回数の集計 | ❌ 型なし |
| `reasoning.effort` / `reasoning.summary` | 推論情報 | ❌ 型なし |

これらを使うにはモジュール拡張 or 型アサーションが必要になり、SDKの恩恵が部分的に相殺される。

### 6.4 結論: A. 全部自前を維持

| 判断理由 | 詳細 |
|---------|------|
| **現行コードが動作済み** | GrokClient約400行が安定稼働中。書き換えのリスクを取る必要がない |
| **xAI固有機能への完全対応** | x_search_call, cost_in_usd_ticks等を型安全に扱える |
| **依存パッケージ最小化** | `openai` パッケージ（約1.5MB）の追加不要 |
| **エージェントループは新規コード** | GrokClientの上に構築するだけなので、SDK有無に関わらず自前実装 |
| **OpenAI SDKで削減できるコード** | SSEパース等の約100-150行。型拡張のコードを考慮すると純減は50行程度 |

**再検討ポイント**:
- xAI APIが大きく変更された場合（SSEフォーマット変更等）
- OpenAI SDKがxAI固有イベントをサポートした場合（公式プロバイダー対応）
- GrokClientの保守コストが月2回以上の修正を要するようになった場合

---

## 7. 方針決定（2026-03-22 統合）

上記分析と [エージェントアーキテクチャ & RAG戦略](./agentic-architecture-and-rag-strategy.md) を統合し、以下の方針で実装を進める:

### 実装順序

| 順序 | 内容 | 優先度 |
|------|------|--------|
| **Step 1** | エージェントループ + `ask_user` ツール | 最高 |
| **Step 2** | RAG基盤構築 + `rag_search` ツール追加 | 高 |
| **Step 3** | コスト最適化・高度化 | 低 |

### アーキテクチャ決定

- **ハイブリッド方式** でツール実行（server-side + client-side混在、xAI公式推奨パターン）
- **自前実装** でエージェントループを構築（HTTPクライアント層も含め全層 `fetch()` 直接）
- **`ask_user` ツールを導入** し、リサーチ・企画立案の品質を向上
- HITL方式は **ストリーム終了方式**（既存のステートレス設計と整合）

### RAG方針

- 旧Phase A（RAG事前実行 → systemPrompt注入）は**スキップ**
- `rag_search` をclient-sideツールとして**エージェントループに直接追加**（Step 2で実施）
- RAG基盤設計（pgvector, hybrid_search, embedding pipeline）は [rag-strategy文書](./agentic-architecture-and-rag-strategy.md) のセクション4が参考資料

→ 実装計画: [`docs/plans/agentic-loop-implementation.md`](../plans/agentic-loop-implementation.md)
