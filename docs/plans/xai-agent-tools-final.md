# xAI Agent Tools 実装計画書（最終版）

> **作成日**: 2026-02-24 14:10
> **レビュー日**: 2026-02-24
> **ステータス**: 実装可（確定）
> **方針**: 全機能共通ツール、LangChain移行前のxAI直接実装を復元・改修

---

## 🔍 要調査事項（実装前に別AIに調査させること）

> **調査完了日**: 2026-02-24 15:30

### 調査1: x_search のSSEイベント型 ✅

**調査結果:**

| 項目 | 結果 |
|------|------|
| `x_search` 使用時の `item.type` | **`x_search_call`** |
| `item.name` フィールド | **無し**（組み込みツールには存在しない） |
| 正しい判定方法 | `item.type === 'x_search_call'` |

**重要:** 現在の推測実装（`custom_tool_call` + `name.includes('x_')`）は**誤り**。正しくは `item.type === 'x_search_call'` で判定する。

**イベント構造の例:**
```json
// ツール開始時: response.output_item.added
{
  "type": "response.output_item.added",
  "item": {
    "id": "item_001",
    "type": "x_search_call",
    "status": "in_progress"
  }
}

// ツール完了時: response.output_item.done
{
  "type": "response.output_item.done",
  "item": {
    "id": "item_001",
    "type": "x_search_call",
    "status": "completed"
  }
}
```

**情報源:**
- [xAI Tools Advanced Usage](https://docs.x.ai/developers/tools/advanced-usage) - `x_search_call` を確認
- 命名パターン: `web_search` → `web_search_call`, `x_search` → `x_search_call`, `code_execution` → `code_interpreter_call`

---

### 調査2: フロントエンドのSSE受信コードの場所 ✅

**調査結果:**

| ファイルパス | 用途 | 主要関数/コンポーネント |
|-------------|------|----------------------|
| `hooks/useLLMStream/index.ts` | メインのストリーミングフック | `useLLMStream()`, `startStream()` |
| `lib/api/llm-client.ts` | APIクライアント（fetch + SSEパース） | `streamLLMResponse()` |
| `lib/llm/sse-parser.ts` | SSEストリームパーサー | `parseSSEStream()` |

**パースしているイベントキー:**
```typescript
// hooks/useLLMStream/index.ts
if (event.content) { ... }           // コンテンツチャンク
if (event.stepStart) { ... }         // 思考ステップ開始
if (event.stepUpdate) { ... }        // 思考ステップ更新
if (event.toolCallEvent) { ... }     // ツール呼び出しイベント
if (event.toolUsage) { ... }         // ツール使用状況
if (event.done) { ... }              // 完了イベント
if (event.error) { ... }             // エラーイベント
```

**ツールインジケーターUI:**
| ファイルパス | 表示内容 |
|-------------|---------|
| `components/chat/StreamingSteps.tsx` | ストリーミング中のステップ全体表示 |
| `components/chat/messages/ToolCallMessage.tsx` | 個別のツール呼び出しメッセージ |
| `components/chat/messages/ToolUsageSummary.tsx` | ツール使用サマリー |

**旧イベント形式の構造:**
```typescript
// lib/llm/sse-parser.ts
export interface SSEEvent {
  content?: string;
  stepStart?: SSEStepEvent;
  stepUpdate?: { id: string; content?: string; status?: 'pending' | 'running' | 'completed' | 'error'; };
  toolCallEvent?: { id: string; type: string; name?: string; input?: string; status: 'pending' | 'running' | 'completed' | 'failed'; };
  toolUsage?: SSEToolUsage;
  done?: boolean;
  usage?: LLMUsage;
  error?: string;
}
```

**補足:** レガシーイベント（`thinking`, `toolCall`, `reasoning`）は後方互換性のために残されている。

---

## コードベースレビュー結果・決定事項

> 既存コードベース（`lib/llm/`, `lib/chat/`, `app/api/llm/stream/route.ts` 等）と照合し、不明点を確認済み。

### 現状把握（調査結果）

#### 現在のLangChain実装の実態

- LangChainは `https://api.x.ai/v1`（**`/v1/chat/completions`**）に接続している
- xAI Agent Tools（x_search 等）は **`/v1/responses`** エンドポイント専用のため、LangChain経由では使用不可
- ツールのコールバック（イベント追跡）コードは存在するが、実際にツールを有効化する仕組みがない
  → 現時点では web_search も x_search も動作していない

#### LangChain移行前の直接実装

LangChain移行前（コミット `b8297cf` 付近）に `lib/llm/clients/grok.ts` として xAI Responses API への直接実装が存在した。このファイルはLangChain移行時に削除されたが、gitから復元して改修することで新規実装より効率的に対応できる。

- 復元ファイル: `lib/llm/clients/grok.ts`（コミット `b8297cf`）
- 合わせて `lib/llm/factory.ts` も削除前の版（コミット `70c1823~1`）を復元

---

### 決定事項

| 項目 | 決定 | 理由 |
|------|------|------|
| アーキテクチャ | **LangChainバイパス・直接APIコール** | x_searchはResponses API専用。LangChain経由では使用不可 |
| 実装方式 | **git復元 + 改修**（新規作成ではない） | `lib/llm/clients/grok.ts` が既にgitに存在するため |
| LangChainの扱い | **保持**（削除しない） | 将来のGemini等追加時にLangChain経由で使用するため |
| SSEイベント形式 | **理想形を新設**（フロントエンドも含めて変更） | 疑似ステップは不要。正確で一貫した設計を採用 |
| collections_search | **削除**（3ツールに統一） | 使用しない |
| x_searchイベント型 | **実装後にテストで確認** | 推測実装→動作確認→パーサー修正の順で進める |

---

### 理想のSSEイベント形式（新設計）

#### 旧形式の問題点

| 問題 | 詳細 |
|------|------|
| 疑似ステップ | `stepStart`/`stepUpdate` はLangChainが機械的に生成する「分析と計画」「情報収集」等で、モデルの実際の動作とは無関係 |
| 構造の不統一 | イベントに共通の `type` ディスクリミネータがなく、フィールド名がばらばら |
| LangChain依存 | xAI直接APIコールに移行するとコールバック機構がなくなり、疑似ステップの生成根拠がなくなる |

#### 新しいSSEイベント型

全イベントに `type` フィールドを持つ discriminated union として定義する（`lib/llm/types.ts`）：

| type | 用途 | 主要フィールド |
|------|------|---------------|
| `start` | ストリーム開始 | - |
| `tool_call` | ツール呼び出し開始・完了 | `id`, `name`, `displayName`, `status`, `input`（任意） |
| `content` | テキストチャンク | `delta` |
| `done` | 完了 | `usage`（トークン数・コスト・ツール使用回数） |
| `error` | エラー | `message` |

`tool_call` の `input` フィールドはクエリ内容やコードをUIに表示するために使用する。APIから取得できる場合は含め、取得できない場合は省略してよい。

#### ストリームの流れ（例）

```
data: {"type": "start"}
data: {"type": "tool_call", "id": "t-1", "name": "web_search", "displayName": "Web検索", "status": "running", "input": "最新のAI動向 2026"}
data: {"type": "tool_call", "id": "t-1", "name": "web_search", "displayName": "Web検索", "status": "completed"}
data: {"type": "tool_call", "id": "t-2", "name": "x_search", "displayName": "X検索", "status": "running", "input": "#AI2026"}
data: {"type": "tool_call", "id": "t-2", "name": "x_search", "displayName": "X検索", "status": "completed"}
data: {"type": "content", "delta": "調査結果によると..."}
data: {"type": "done", "usage": {"inputTokens": 1234, "outputTokens": 567, "cost": 0.0023, "toolCalls": {"web_search": 1, "x_search": 1}}}
```

#### 旧形式との比較

| 観点 | 旧形式 | 新形式 |
|------|--------|--------|
| ディスクリミネータ | なし（フィールドの有無で判断） | `type` フィールドで統一 |
| 思考ステップ | 疑似的な5段階ステップ（実態と無関係） | なし（正確） |
| ツール情報 | `toolCallEvent: {type, status, name, id}` | `{type: "tool_call", name, status, id, displayName}` |
| フロントエンド変更 | 不要（維持） | **必要**（SSEイベント受信コード） |

---

### 残課題（実装時に確認）

- [x] `x_search` の実際のSSEイベント型を確認し、パーサーを修正する（→ 冒頭「要調査事項」参照）
- [x] フロントエンドのSSE受信コードを特定し、新形式に対応させる（→ 冒頭「要調査事項」参照）

---

## 概要

X検索（Twitter検索）が必須要件。全チャット機能で共通のツールセットを使用し、AIが自律的に必要なツールを選択・組み合わせて使用する。

---

## 採用アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                         Teddy UI                             │
│              （全機能で共通のツールインジケーター）              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              /api/llm/stream (Next.js API)                   │
│                    （全ツール有効で統一）                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
             ┌──────────────▼──────────────┐
             │     lib/llm/factory.ts       │
             │  grok-* → GrokClient (直接)  │
             │  その他 → LangChain (将来)   │
             └──────────────┬──────────────┘
                            │ (grok の場合)
                            ▼
             ┌──────────────────────────────┐
             │  lib/llm/clients/grok.ts     │
             │  xAI /v1/responses API       │
             │  (+ web_search               │
             │   + x_search                 │
             │   + code_execution)          │
             └──────────────────────────────┘
```

**LangChainは削除しない**: `lib/llm/langchain/` は将来のGemini等追加に備えて保持する。現在は Factory から呼ばれない。

---

## 共通ツールセット

### 全機能で使用（デフォルト）

| ツール | 用途 |
|--------|------|
| `web_search` | Web検索 - 最新情報、エビデンス収集 |
| `x_search` | X（Twitter）検索 - リアルタイム動向、トレンド |
| `code_execution` | コード実行 - 計算、データ分析、グラフ生成 |

`collections_search` は廃止（3ツールに統一）。

### AIの自律的ツール選択

ユーザーはツールを指定せず、AIがクエリに応じて自動選択：

| ユーザークエリ | AIのツール選択 |
|--------------|---------------|
| "最新のAIニュースを教えて" | `web_search` |
| "この人のXでの反応は？" | `x_search` |
| "このデータの平均を計算して" | `code_execution` |
| "WebとXでこのトピックを調べて" | `web_search` + `x_search` |

---

## 機能別対応

| 機能 | ツール使用 | 備考 |
|------|-----------|------|
| `research-cast` | ✅ 全ツール | 出演者調査にWeb+X+コード |
| `research-info` | ✅ 全ツール | 情報収集にWeb+X |
| `research-evidence` | ✅ 全ツール | ファクトチェックにWeb+X |
| `research-location` | ✅ 全ツール | ロケ地調査にWeb |
| `proposal` | ✅ 全ツール | トレンド調査にWeb+X |
| `general-chat` | ✅ 全ツール | 必要に応じて検索 |
| `minutes` | ✅ 全ツール | 必要に応じてコード実行等 |
| `na-script` | ✅ 全ツール | 必要に応じて検索 |

**方針**: 全機能で共通ツールセット。AIが自律的に使い分ける。

---

## 実装ファイル

### 復元（git から取得）

| ファイル | 取得元コミット | 説明 |
|---------|--------------|------|
| `lib/llm/clients/grok.ts` | `b8297cf` | xAI Responses API直接実装の最終版 |
| `lib/llm/factory.ts` | `70c1823~1` | GrokClient使用版のFactory |

### 修正（復元後に改修）

| ファイル | 変更内容 | 工数 |
|---------|---------|------|
| `lib/llm/clients/grok.ts` | ツール設定を簡略化（boolean flags → ツール配列）、`collections_search`削除、SSEイベント形式を新形式に変更 | 2h |
| `lib/llm/factory.ts` | GrokClient分岐の整理、LangChainパスはコメントアウトで保持 | 0.5h |
| `lib/llm/types.ts` | `streamWithUsage` メソッドをLLMClientインターフェースに追加、新SSEイベント型を定義 | 0.5h |
| `lib/llm/index.ts` | エクスポートを整理（GrokClient関連の型・定数を公開） | 0.5h |
| `app/api/llm/stream/route.ts` | `toolOptions` 削除、`streamWithUsage` に切り替え、新SSEイベント形式で出力 | 1h |
| `lib/chat/chat-config.ts` | 機能別 `toolOptions` を削除 | 0.5h |
| `lib/chat/agents.ts` | エージェントのツール設定を削除（全機能共通に統一） | 0.5h |
| `app/admin/grok-tools/page.tsx` | ツール個別ON/OFF UIを削除、`collections_search` 列を削除 | 1h |
| `lib/llm/sse-parser.ts` | 新SSEイベント型（discriminated union）のパース実装 | 1h |
| `lib/api/llm-client.ts` | `streamLLMResponse()` を新形式対応（旧キー削除） | 0.5h |
| `hooks/useLLMStream/index.ts` | `startStream()` を新形式（`type` ディスクリミネータ）に対応 | 0.5h |

### 削除（または無効化）

| ファイル/機能 | 理由 |
|--------------|------|
| `lib/settings/db.ts` の `GrokToolType` の `collections_search` | 3ツールに統一 |
| 管理画面のツール個別ON/OFF | 全ツール常時有効のため不要 |
| `toolOptions` パラメータ（route.ts） | フロントエンドからの指定不要 |

**合計工数: 約8.5時間**（git復元で新規作成コストが削減。フロントエンド修正ファイルは `lib/llm/sse-parser.ts`, `lib/api/llm-client.ts`, `hooks/useLLMStream/index.ts` の3ファイル確定）

---

## 実装詳細

### grok.ts の改修内容（復元後）

復元した `lib/llm/clients/grok.ts` に対して以下3点を改修する：

**1. ツール設定の簡略化**

- 旧: `enableWebSearch`, `enableXSearch`, `enableCodeExecution`, `enableFileSearch` の boolean フラグ
- 新: `tools?: GrokToolType[]` の配列（未指定時は全3ツールを使用）
- `DEFAULT_GROK_TOOLS` 定数を定義し、`collections_search` は削除
- `TOOL_DISPLAY_NAMES` 定数で表示名を管理

**2. SSEイベント形式の変更**

`streamWithUsage()` が出力するイベントを新形式に変更：

- ストリーム開始時に `{type: 'start'}` を emit
- ツール開始時に `{type: 'tool_call', status: 'running', input: '...', ...}` を emit（`input` はAPIから取得できれば含める）
- ツール完了時に `{type: 'tool_call', status: 'completed', ...}` を emit
- テキストチャンクは `{type: 'content', delta: '...'}` で emit
- 完了時に `{type: 'done', usage: {...}}` を emit（toolCalls使用回数含む）
- エラー時に `{type: 'error', message: '...'}` を emit

**3. x_search のイベント型**

調査済み。xAI APIが `x_search` 呼び出し時に返すイベント型は `x_search_call`。命名パターン: `web_search` → `web_search_call`, `x_search` → `x_search_call`, `code_execution` → `code_interpreter_call`。

- 組み込みツールには `item.name` フィールドは存在しない
- 正しい判定方法: `item.type === 'x_search_call'`（`item.type === 'web_search_call'` 等と同様）
- 旧推測実装（`custom_tool_call` + `name.includes('x_')`）は**誤り**のため使用しないこと

---

### Factory の改修内容

復元した `lib/llm/factory.ts` を以下のように整理：

- `grok-*` プロバイダーは `GrokClient`（直接実装）にルーティング
- その他プロバイダーはLangChain経由にルーティング（現在は未使用だがコメントアウトで保持）
- `grok-*` 以外が指定された場合は明示的なエラーを返す

---

### route.ts の改修内容

- リクエストスキーマから `toolOptions` を削除
- `LLMClient.stream()` の代わりに `LLMClient.streamWithUsage()` を呼び出す
- SSEストリームのエンコードは新イベント形式（各イベントにJSONシリアライズ）で統一
- エラーはストリーム内で `{type: 'error', message: '...'}` として返す

---

## UI表示

### ツールインジケーター（全機能共通）

```
🔍 Web検索 [実行中...]
🐦 X検索   [完了 ✓]
💻 コード実行 [待機中]

回答本文...
```

### 使用状況サマリー

```
Web検索: 2回 • X検索: 1回 • コード実行: 0回
1,234 入力 / 567 出力 • $0.00567
```

---

## 実装スケジュール

### Day 1: 復元・改修

| タスク | 内容 |
|--------|------|
| git復元 | `grok.ts`（b8297cf）と `factory.ts`（70c1823~1）を復元 |
| grok.ts改修 | ツール設定簡略化・SSEイベント形式変更 |
| factory.ts整理 | GrokClient分岐を整理 |
| types.ts更新 | `streamWithUsage` 追加・新SSEイベント型定義 |
| 動作確認 | API疎通・ストリーム確認 |

### Day 2: 統合と簡略化

| タスク | 内容 |
|--------|------|
| route.ts修正 | toolOptions削除・新形式対応 |
| chat-config.ts修正 | toolOptions削除 |
| agents.ts修正 | ツール設定削除 |
| 管理画面UI修正 | ツール個別設定削除 |

### Day 3: フロントエンド対応と最終確認

| タスク | 内容 |
|--------|------|
| SSE受信コンポーネント修正 | 新イベント形式（typeディスクリミネータ）対応 |
| x_searchイベント型確認 | 実APIレスポンスを見てパーサー修正 |
| 統合テスト | 全機能・全ツールの動作確認 |

---

## テスト項目

### 機能テスト

| # | テスト項目 | 期待結果 |
|---|-----------|---------|
| 1 | Web検索実行 | `type: 'tool_call'` イベントが生成される |
| 2 | X検索実行 | `type: 'tool_call'` イベントが生成される |
| 3 | コード実行 | `type: 'tool_call'` イベントが生成される |
| 4 | AIの自律的ツール選択 | クエリに応じて適切なツールが選ばれる |
| 5 | ツール実行中のUI表示 | ツールインジケーターが正しく表示される |
| 6 | 使用状況サマリー | `done` イベントの `usage.toolCalls` に使用回数が含まれる |

### エラーテスト

| # | テスト項目 | 期待結果 |
|---|-----------|---------|
| 1 | API Key無効 | `type: 'error'` イベントが生成される |
| 2 | レート制限 | 適切なハンドリング |
| 3 | ストリーム中断 | クリーンアップ |

---

## コスト見積もり

### xAI Agent Tools料金

| 項目 | 料金 |
|------|------|
| Grok 4.1 Fast | $0.20/1M input, $0.50/1M output |
| ツール使用 | 最大$5/1000回 |

### 見積もり（全ツール有効時）

| シナリオ | 推定コスト/回 |
|---------|--------------|
| 簡単な質問（ツール未使用） | $0.001 - $0.003 |
| 標準的な調査（1-2ツール） | $0.01 - $0.03 |
| 複雑な調査（全ツール） | $0.03 - $0.08 |

---

## 関連ドキュメント

- [xAI Responses API](https://docs.x.ai/developers/endpoints/responses)
- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- [復元・実装ガイド](../backlog/xai-implementation-restore-guide.md)
- `docs/specs/api-integration/streaming-events.md` - SSEイベント仕様
