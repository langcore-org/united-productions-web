# エージェントループ + ask_user ツール実装計画

> **作成日**: 2026-03-22
> **最終更新**: 2026-03-22
> **前提ドキュメント**:
> - [分析レポート](../research-reports/agentic-loop-self-implementation-analysis.md) — 自前実装 vs フレームワークの判断根拠、HTTPクライアント層の選定
> - [エージェントアーキテクチャ & RAG戦略](../research-reports/agentic-architecture-and-rag-strategy.md) — RAG基盤設計（hybrid_search, embedding, pgvector）
> - [エージェンティックチャット設計](./agentic-chat-design.md) — プロンプト・UI設計（Phase 1-5完了済み）
>
> **方針決定**: 自前実装 + `ask_user` ツール導入 → 安定後に `rag_search` ツール追加

---

## 1. スコープ

### 既に完了しているもの（agentic-chat-design.md Phase 1-5）

- エージェント的振る舞いのシステムプロンプト
- AgenticResponse UIコンポーネント
- FeatureChatへの統合
- 機能別ツール設定
- ツール実行状態・思考プロセスの表示

### 本計画で実装するもの

| 項目 | 概要 |
|------|------|
| **エージェントループ** | tool_calls検出 → ローカルツール実行 → 結果追加 → 再リクエスト |
| **`ask_user` ツール** | LLMがユーザーに質問を投げるHITLメカニズム |
| **`rag_search` ツール** | 社内ナレッジのハイブリッド検索（将来拡張枠） |

### スコープ外

- LangGraph等のフレームワーク導入（分析レポートにより不採用）
- 複数エージェントの並列実行
- ワークフローの動的生成

---

## 2. 要件

### 2.1 機能要件

#### エージェントループ

| ID | 要件 | 優先度 |
|----|------|--------|
| AL-1 | LLMレスポンス内の `tool_calls` を検出し、ローカルツールを実行し、結果をメッセージに追加して再リクエストできる | 必須 |
| AL-2 | xAI server-sideツール（web_search, x_search）とローカルツール（ask_user, rag_search）を同一リクエストで混在できる | 必須 |
| AL-3 | ループ回数の上限を設定できる（デフォルト: 5ターン） | 必須 |
| AL-4 | 各ツール実行とループ全体にタイムアウトを設定できる | 必須 |
| AL-5 | ツール実行の開始・完了をSSEイベントとしてストリーミングできる | 必須 |
| AL-6 | 既存の全5機能（general-chat, research-cast, research-evidence, minutes, proposal）で動作する | 必須 |
| AL-7 | エージェントループを使わない従来モードとの後方互換性を維持する | 推奨 |

#### ask_user ツール

| ID | 要件 | 優先度 |
|----|------|--------|
| AU-1 | LLMが自律的に「ユーザーに確認が必要」と判断したタイミングで `ask_user` を呼び出せる | 必須 |
| AU-2 | `ask_user` 呼び出し時にストリームを終了し、質問内容をUIに表示する（ストリーム終了方式） | 必須 |
| AU-3 | 質問に選択肢（options）を含められる。UIは選択肢ボタンを表示する | 必須 |
| AU-4 | 選択肢なしの場合、自由テキスト入力で回答できる | 必須 |
| AU-5 | ユーザーの回答は通常のメッセージ送信と同じ経路で処理される（特別なAPIエンドポイント不要） | 必須 |
| AU-6 | 回答後、LLMは前回のメッセージ履歴からコンテキストを復元して続行できる | 必須 |
| AU-7 | 1タスクあたりの ask_user 使用回数を制限できる（デフォルト: 最大2回、プロンプトで制御） | 必須 |
| AU-8 | ユーザーが回答せずに新しいメッセージを送った場合、通常のチャットとして処理する | 推奨 |

### 2.2 非機能要件

| ID | 要件 | 基準 |
|----|------|------|
| NF-1 | **レイテンシ** | エージェントループのオーバーヘッドは1ターンあたり100ms以下（LLM呼び出し時間を除く） |
| NF-2 | **コスト制御** | maxTurns + globalTimeout により、1リクエストあたりのAPI呼び出し回数を予測可能にする |
| NF-3 | **UX** | ask_userの質問が多すぎてユーザーが煩わしく感じない（プロンプトで最大2回に制限） |
| NF-4 | **ステートレス** | 各APIコールは独立。ask_user後の状態復元はメッセージ履歴のみに依存（サーバー側の状態保持なし） |
| NF-5 | **エラー耐性** | ツール実行エラーでループ全体が停止しない。エラーをLLMに伝えてリカバリを試みる |
| NF-6 | **可観測性** | 各ターンのツール呼び出し、実行時間、トークン使用量をログ出力する |

### 2.3 機能別ユースケース

各機能でエージェントループと ask_user がどう品質を向上させるか:

| 機能 | エージェントループの効果 | ask_user の効果 |
|------|----------------------|----------------|
| **research-cast** | Web/X検索 → 結果不足時に別クエリで再検索 | 「候補カテゴリはどれを重視しますか？（医師/タレント/アスリート）」→ 絞り込んで深掘り |
| **research-evidence** | 1回目の検索で裏付け不足 → 検索戦略を変えて再調査（最大3回） | 矛盾する情報がある場合「どちらの観点を重視しますか？」 |
| **proposal** | 類似企画の成功事例を検索 → 実現可能性を自己評価 → 不足情報を追加検索 | 「方向性を3つ考えました。どれを深掘りしますか？（体験型/SNS連動型/ドキュメント型）」 |
| **minutes** | 議事録生成後に自己レビュー → 不明箇所をハイライト | 「発言者が不明な箇所があります。確認してもよいですか？」 |
| **general-chat** | 質問に応じてWeb検索 → 回答生成（現状と同等） | 曖昧な質問時「もう少し具体的に教えていただけますか？」（低頻度） |

### 2.4 HTTPクライアント層の選定

**決定: 全層自前実装を維持**（既存GrokClientの `fetch()` 直接呼び出しを継続）

OpenAI SDKの利用も検討したが、xAI固有機能（`x_search_call`, `cost_in_usd_ticks`等）への対応が必要なため、SDK導入の恩恵が限定的と判断。

詳細な比較・調査: [分析レポート セクション5](../research-reports/agentic-loop-self-implementation-analysis.md#5-httpクライアント層の選定調査2026-03-22)

### 2.5 制約条件

| 制約 | 理由 |
|------|------|
| xAI Responses APIを `fetch()` で直接呼び出し | 既存GrokClientが安定稼働中、OpenAI SDK導入の恩恵が限定的（2.4参照） |
| server-sideツール（web_search, x_search）はxAIが自動実行 | ローカルでの実行不可、xAI APIの仕様 |
| ask_userのストリーム終了方式は変更不可 | 既存のステートレス設計（Supabase履歴 + ステートレスAPI）との整合性維持 |
| LangChain/LangGraph不使用 | [分析レポート](../research-reports/agentic-loop-self-implementation-analysis.md)による判断 |

---

## 3. アーキテクチャ

### 3.1 現状 vs 目標

```
【現状】xAI server-sideツールのみ
ユーザー → API → GrokClient.streamChat(messages, tools:[web_search, x_search])
                    ↓
              xAIが自動でツール実行 → 1回のレスポンスで完結
                    ↓
              ストリーミング応答 → ユーザー

【目標】server-side + client-sideツールのハイブリッド
ユーザー → API → AgentLoop(messages, tools:[web_search, x_search, ask_user, rag_search])
                    ↓
              GrokClient呼び出し
                    ↓
              レスポンス解析
                ├── テキスト → ストリーミング応答 → ユーザー（ループ終了）
                ├── web_search/x_search → xAI自動実行 → ループ継続
                ├── ask_user → ストリーム終了、質問をUIに表示（ループ中断）
                └── rag_search → ローカルで実行 → 結果追加 → ループ継続
```

### 3.2 ファイル構成

```
lib/
├── llm/
│   ├── clients/
│   │   └── grok.ts              # 既存: GrokClient（変更小）
│   ├── agent/
│   │   ├── agent-loop.ts        # 新規: エージェントループ本体
│   │   ├── tools/
│   │   │   ├── types.ts         # 新規: ツール型定義
│   │   │   ├── ask-user.ts      # 新規: ask_userツール定義
│   │   │   └── rag-search.ts    # 新規: rag_searchツール定義（将来）
│   │   └── index.ts             # 新規: エクスポート
│   └── types.ts                 # 既存: 型定義に追加
app/
├── api/
│   └── chat/
│       └── feature/
│           └── route.ts         # 既存: エージェントループ呼び出しに変更
components/
├── chat/
│   └── AskUserCard.tsx          # 新規: ask_user質問カードUI
```

---

## 4. 詳細設計

### 4.1 ツール型定義

```typescript
// lib/llm/agent/tools/types.ts

/** ローカル実行ツールの定義 */
export interface LocalToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema
}

/** ask_userツールの引数 */
export interface AskUserArgs {
  question: string;
  options?: string[];       // 選択肢（省略時は自由入力）
  context?: string;         // 質問の背景
}

/** エージェントループのイベント */
export type AgentEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; tool: string; query?: string }
  | { type: "tool_end"; tool: string; duration: number }
  | { type: "ask_user"; question: string; options?: string[]; context?: string }
  | { type: "done"; usage?: UsageInfo }
  | { type: "error"; message: string };
```

### 4.2 エージェントループ

```typescript
// lib/llm/agent/agent-loop.ts

export interface AgentLoopOptions {
  maxTurns?: number;          // デフォルト: 5
  toolTimeoutMs?: number;     // デフォルト: 30000
  globalTimeoutMs?: number;   // デフォルト: 120000
}

/**
 * エージェントループ
 *
 * tool_calls を検出し、ローカルツール（ask_user, rag_search）を実行、
 * 結果をメッセージに追加して再リクエストするループ。
 *
 * xAI server-sideツール（web_search, x_search）はxAIが自動実行するため、
 * ループで処理するのはローカルツールのみ。
 */
export async function* agentLoop(
  messages: LLMMessage[],
  systemPrompt: string,
  options: AgentLoopOptions = {}
): AsyncGenerator<AgentEvent> {
  const {
    maxTurns = 5,
    toolTimeoutMs = 30_000,
    globalTimeoutMs = 120_000,
  } = options;

  const grok = createLLMClient("grok-4-1-fast-reasoning");
  const startTime = Date.now();

  for (let turn = 0; turn < maxTurns; turn++) {
    // グローバルタイムアウトチェック
    if (Date.now() - startTime > globalTimeoutMs) {
      yield { type: "error", message: "処理がタイムアウトしました" };
      return;
    }

    // LLM呼び出し（ストリーミング）
    // → xAI server-sideツール（web_search等）はこの中で自動実行される
    const response = await grok.streamChatWithToolCalls(messages, {
      systemPrompt,
      tools: getToolDefinitions(),  // server-side + client-side
      onTextDelta: (delta) => { /* yield text_delta */ },
      onToolStart: (tool, query) => { /* yield tool_start */ },
      onToolEnd: (tool, duration) => { /* yield tool_end */ },
    });

    // ローカルツール呼び出しの検出
    const localToolCalls = response.toolCalls?.filter(isLocalTool) ?? [];

    if (localToolCalls.length === 0) {
      // ツール呼び出しなし → 最終応答として終了
      yield { type: "done", usage: response.usage };
      return;
    }

    // ローカルツールの実行
    for (const toolCall of localToolCalls) {
      if (toolCall.name === "ask_user") {
        // ask_user: ストリームを終了してUIに質問を返す
        const args: AskUserArgs = JSON.parse(toolCall.arguments);
        yield {
          type: "ask_user",
          question: args.question,
          options: args.options,
          context: args.context,
        };
        return; // ループ終了。ユーザーの応答は次のAPIコールで処理
      }

      // その他のローカルツール（rag_search等）
      const result = await executeLocalTool(toolCall, { timeoutMs: toolTimeoutMs });
      messages.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    }

    // ローカルツールの結果を追加して次のターンへ
  }

  yield { type: "error", message: `最大ターン数（${maxTurns}）に達しました` };
}
```

### 4.3 ask_user ツール定義

```typescript
// lib/llm/agent/tools/ask-user.ts

export const ASK_USER_TOOL: LocalToolDefinition = {
  name: "ask_user",
  description: [
    "調査の方向性を確認したい時や、候補を絞り込むためにユーザーの選択が必要な時に使用する。",
    "使用条件:",
    "- ユーザーの意図が曖昧で、調査方向が2つ以上に分かれる場合",
    "- 候補が多数あり、絞り込みにユーザーの判断が必要な場合",
    "- 調査結果に矛盾があり、どちらを重視するかの判断が必要な場合",
    "使用しない条件:",
    "- 自分で判断できる場合（まず自力で調査を試みる）",
    "- 既にユーザーが十分な指示を提供している場合",
    "1回のタスクで最大2回まで使用可能。",
  ].join("\n"),
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
};
```

### 4.4 ask_user UIコンポーネント

```typescript
// components/chat/AskUserCard.tsx

interface AskUserCardProps {
  question: string;
  options?: string[];
  context?: string;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

/**
 * LLMからの質問を表示するカード。
 * 選択肢がある場合はボタン、ない場合はテキスト入力を表示。
 * ユーザーの回答は通常のメッセージ送信と同じ経路で処理される。
 */
```

### 4.5 ストリーム終了方式の詳細

```
【ask_user発生時のデータフロー】

Turn 1:
  POST /api/chat/feature
  ├── agentLoop開始
  ├── GrokClient: web_searchでリサーチ（xAI自動実行）
  ├── GrokClient: ask_user tool_callを返す
  ├── agentLoop: ask_userイベントをyield → ストリーム終了
  └── SSEレスポンス:
       data: {"type":"tool_start","tool":"web_search"}
       data: {"type":"tool_end","tool":"web_search","duration":1200}
       data: {"type":"text_delta","delta":"候補を調査しました。"}
       data: {"type":"ask_user","question":"...","options":["A","B","C"]}
       data: [DONE]

  UI:
  ├── ツール実行表示（Web検索中...→完了）
  ├── 中間テキスト表示
  └── AskUserCard表示（質問 + 選択肢ボタン）

Turn 2:
  ユーザーが選択肢を押す or テキスト入力
  ↓
  POST /api/chat/feature（通常のメッセージ送信）
  ├── messages: [...前回の履歴, { role: "user", content: "Aを選択" }]
  ├── agentLoop開始（履歴からコンテキスト復元）
  └── 最終応答を生成
```

---

## 5. 実装フェーズ

### Phase 1: エージェントループ基盤（1日）

| タスク | ファイル | 詳細 |
|--------|---------|------|
| ツール型定義 | `lib/llm/agent/tools/types.ts` | AgentEvent, LocalToolDefinition |
| エージェントループ | `lib/llm/agent/agent-loop.ts` | maxTurns, タイムアウト, ツール実行 |
| GrokClient拡張 | `lib/llm/clients/grok.ts` | `streamChatWithToolCalls` メソッド追加 |
| APIルート変更 | `app/api/chat/feature/route.ts` | agentLoop呼び出しに変更 |

### Phase 2: ask_user ツール（0.5日）

| タスク | ファイル | 詳細 |
|--------|---------|------|
| ツール定義 | `lib/llm/agent/tools/ask-user.ts` | パラメータ, description |
| ループ内処理 | `lib/llm/agent/agent-loop.ts` | ask_user検出 → yield → return |
| SSEイベント追加 | `app/api/chat/feature/route.ts` | ask_userイベントのシリアライズ |
| UIコンポーネント | `components/chat/AskUserCard.tsx` | 質問カード（選択肢 or 自由入力） |
| フック拡張 | `hooks/useLLMStream/index.ts` | ask_userイベントの処理 |

### Phase 3: 統合テスト・調整（0.5日）

| タスク | 詳細 |
|--------|------|
| E2Eフロー確認 | research-castで ask_user → 回答 → 最終応答の流れ |
| エッジケース | タイムアウト、ユーザーが回答しない、空回答 |
| プロンプト調整 | ask_userの使用頻度が適切か確認・調整 |
| 型チェック・ビルド | `tsc --noEmit` + `npm run build` |

### Phase 4: RAG基盤構築 + rag_search ツール（Phase 1-3安定後、別計画で実施）

エージェントループが安定した後、`rag_search` をclient-sideツールとしてエージェントループに追加する。

| 決定事項 | 内容 |
|---------|------|
| **方式** | Phase A（RAG事前実行 → systemPrompt注入）はスキップ。最初から `rag_search` ツールとして実装 |
| **理由** | エージェントループが存在する状態では、ツール化の方が自然。LLMが検索クエリを自律的に最適化できる |
| **RAG基盤設計の参照先** | [rag-strategy セクション4](../research-reports/agentic-architecture-and-rag-strategy.md)（hybrid_search, embedding, pgvector設計） |
| **ロードマップ** | [rag-strategy セクション6 Phase 2](../research-reports/agentic-architecture-and-rag-strategy.md) |

---

## 6. 判断記録

| 判断事項 | 選択 | 根拠 |
|---------|------|------|
| フレームワーク vs 自前 | **自前実装** | RAG統合必須、ユースケースがシンプル、既存GrokClient活用（[分析レポート](../research-reports/agentic-loop-self-implementation-analysis.md)） |
| HTTPクライアント層 | **全層自前（fetch直接）** | xAI固有機能への対応、SDK導入の恩恵が限定的（[分析レポート セクション6](../research-reports/agentic-loop-self-implementation-analysis.md)） |
| ask_user導入 | **導入** | リサーチ・企画立案の品質向上、リスク低（オプショナルツール） |
| HITL方式 | **ストリーム終了方式** | 既存のステートレス設計と整合、状態管理不要 |
| ask_user回数制限 | **最大2回/タスク** | UX劣化防止、プロンプトで制御 |
| ループ上限 | **5ターン** | 過剰なAPI呼び出し防止、コスト制御 |
| 実装順序 | **Agent Loop先 → RAG後** | 現在のナレッジ（約5,500行）はsystemPromptに収まりRAG不急、ask_userの即効性 |
| RAG方式 | **Phase Aスキップ、rag_searchツール直接** | エージェントループ存在下では事前実行方式が中途半端、LLMのクエリ最適化の利点 |

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| LLMがask_userを多用しすぎる | UX劣化 | プロンプトで「最大2回、自分で判断できるなら聞くな」と制御 |
| ループが無限に回る | コスト増大 | maxTurns=5 + globalTimeout=120s |
| xAI server-sideツールとの干渉 | 予期しないレスポンス | server-sideツールのイベントはGrokClient内で完結させる |
| ask_user後のコンテキスト欠落 | 応答品質低下 | メッセージ履歴に中間結果を含めて送信 |

---

## 8. 再評価トリガー

以下の状況が発生したら、フレームワーク導入を再検討する:

- 分岐が3箇所を超えるワークフローが必要になった
- 複数エージェントの並列協調が必要になった
- ワークフローの動的生成が必要になった
- エージェントループのバグ修正に週1回以上の工数が発生している
