# xAI Agent Tools 実装計画（最終版）

> **ステータス**: ✅ 実装完了
> **更新日**: 2026-02-24 16:10
> **実装期間**: 2026-02-21 〜 2026-02-24

---

## 概要

xAI (Grok) の Agent Tools（web_search, x_search, code_execution）を全機能で使用可能にする。
LangChainをバイパスし、xAI Responses APIを直接呼び出す実装に移行。

**成果**:
- 30ファイル変更
- 2,468行追加 / 2,089行削除
- LangChain依存を排除し、直接API呼び出しに移行
- SSEイベント形式をdiscriminated unionに刷新

---

## 実装済み内容

### アーキテクチャ

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

### 新規作成

| ファイル | 説明 | 行数 |
|---------|------|------|
| `lib/llm/clients/grok.ts` | xAI Responses API直接実装 | 360行 |
| `lib/llm/types.ts` | LLM統合の型定義（新SSEイベント型） | 80行 |

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `lib/llm/factory.ts` | GrokClient分岐の整理、LangChainパスはコメントアウトで保持 |
| `lib/llm/index.ts` | エクスポートを整理（GrokClient関連の型・定数を公開） |
| `app/api/llm/stream/route.ts` | `toolOptions` 削除、`streamWithUsage` に切り替え、新SSEイベント形式で出力 |
| `lib/chat/chat-config.ts` | 機能別 `toolOptions` を削除 |
| `lib/chat/agents.ts` | エージェントのツール設定を削除（全機能共通に統一） |
| `app/admin/grok-tools/page.tsx` | ツール個別ON/OFF UIを削除、`collections_search` 列を削除 |
| `lib/llm/sse-parser.ts` | 新SSEイベント型（discriminated union）のパース実装 |
| `lib/api/llm-client.ts` | `streamLLMResponse()` を新形式対応（旧キー削除） |
| `hooks/useLLMStream/index.ts` | `startStream()` を新形式（`type` ディスクリミネータ）に対応 |
| `components/ui/FeatureChat.tsx` | lintエラー根本解決（useCallback化、依存配列修正） |

### 削除

| ファイル/機能 | 理由 |
|--------------|------|
| `lib/settings/db.ts` の `GrokToolType` の `collections_search` | 3ツールに統一 |
| 管理画面のツール個別ON/OFF | 全ツール常時有効のため不要 |
| `toolOptions` パラメータ（route.ts） | フロントエンドからの指定不要 |

---

## 実装詳細

### grok.ts の実装内容

**1. ツール設定の簡略化**

- `tools?: GrokToolType[]` の配列（未指定時は全3ツールを使用）
- `DEFAULT_GROK_TOOLS` 定数を定義し、`collections_search` は削除
- `TOOL_DISPLAY_NAMES` 定数で表示名を管理

**2. SSEイベント形式の変更**

`streamWithUsage()` が出力するイベントをdiscriminated union形式に変更：

```typescript
export type SSEEvent =
  | { type: 'start' }
  | { type: 'tool_call'; id: string; name: GrokToolType; displayName: string; status: 'running' | 'completed'; input?: string }
  | { type: 'content'; delta: string }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number; cost: number; toolCalls: Record<string, number> } }
  | { type: 'error'; message: string };
```

- ストリーム開始時に `{type: 'start'}` を emit
- ツール開始時に `{type: 'tool_call', status: 'running', input: '...', ...}` を emit
- ツール完了時に `{type: 'tool_call', status: 'completed', ...}` を emit
- テキストチャンクは `{type: 'content', delta: '...'}` で emit
- 完了時に `{type: 'done', usage: {...}}` を emit（toolCalls使用回数含む）
- エラー時に `{type: 'error', message: '...'}` を emit

**3. x_search のイベント型**

xAI APIが `x_search` 呼び出し時に返すイベント型は `x_search_call`：

- `web_search` → `web_search_call`
- `x_search` → `x_search_call`
- `code_execution` → `code_interpreter_call`

組み込みツールには `item.name` フィールドは存在しない。正しい判定方法: `item.type === 'x_search_call'`

### Factory の実装内容

- `grok-*` プロバイダーは `GrokClient`（直接実装）にルーティング
- その他プロバイダーは明示的なエラーを返す
- LangChain経由のコードはコメントアウトで保持（将来のGemini追加時に再利用）

### route.ts の実装内容

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

## テスト結果

### 機能テスト

| # | テスト項目 | 結果 |
|---|-----------|------|
| 1 | Web検索実行 | ✅ `type: 'tool_call'` イベントが生成される |
| 2 | X検索実行 | ✅ `type: 'tool_call'` イベントが生成される |
| 3 | コード実行 | ✅ `type: 'tool_call'` イベントが生成される |
| 4 | AIの自律的ツール選択 | ✅ クエリに応じて適切なツールが選ばれる |
| 5 | ツール実行中のUI表示 | ✅ ツールインジケーターが正しく表示される |
| 6 | 使用状況サマリー | ✅ `done` イベントの `usage.toolCalls` に使用回数が含まれる |

### エラーテスト

| # | テスト項目 | 結果 |
|---|-----------|------|
| 1 | API Key無効 | ✅ `type: 'error'` イベントが生成される |
| 2 | レート制限 | ✅ 適切なハンドリング |
| 3 | ストリーム中断 | ✅ クリーンアップ |

### ビルド・Lint

| 項目 | 結果 |
|------|------|
| TypeScript型チェック | ✅ パス |
| Biome Lint | ✅ パス |
| Next.jsビルド | ✅ パス |

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

## 学びと教訓

### lintエラー対応

**問題**: FeatureChat.tsxでreact-hooks/exhaustive-depsエラーが発生

**対応**:
- ❌ 無視コメント（`// biome-ignore`）を使わない
- ✅ 根本的な解決（useCallback化、依存配列の適切な設定）

**結果**: コードの品質と保守性が向上

### SSEイベント形式の刷新

**旧形式**: `stepStart`/`stepUpdate`/`toolCallEvent` など混在
**新形式**: `type` ディスクリミネータによる統一（discriminated union）

**利点**:
- 型安全性の向上
- パースロジックの簡素化
- 拡張性の向上

---

## 関連ドキュメント

- [xAI Responses API](https://docs.x.ai/developers/endpoints/responses)
- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- `docs/specs/api-integration/streaming-events.md` - SSEイベント仕様
- `docs/lessons/lint-error-handling.md` - lintエラー対応の教訓

---

## 今後の展望

- Google Gemini追加時にLangChain経由の実装を復活
- ツール使用状況の詳細な分析・可視化
- コスト最適化（ツール使用の自動制限等）

---

## 付録: Vercel AI SDKへの移行を検討すべきタイミング

現在はxAI Responses APIを直接呼び出す実装（`lib/llm/clients/grok.ts`）を採用しているが、将来的にVercel AI SDK（`@ai-sdk/xai`）への移行を検討する場合がある。

### 現状の比較

| 項目 | 現在の直接API実装 | Vercel AI SDK |
|------|------------------|---------------|
| **実装方式** | xAI Responses API直接呼び出し | `@ai-sdk/xai`ラッパー |
| **メンテナンス** | 自前 | 公式サポート |
| **カスタマイズ性** | 高い（完全な制御） | 中（SDKの制約あり） |
| **型安全性** | 自前の型定義 | 公式の型定義 |
| **機能追加の容易さ** | 自前実装が必要 | SDKのアップデートで対応 |

### 移行を検討すべきタイミング

#### 1. 優先度：高（積極的に検討）

| 状況 | 理由 |
|------|------|
| **xAI APIの破壊的変更** | 直接実装のメンテナンスコストが急増した場合 |
| **セキュリティ脆弱性** | 自前のSSEパーサー等に問題が発見された場合 |
| **Vercel AI SDKの機能不足が解消** | `tool-input-delta`等の取得が標準化された場合 |

#### 2. 優先度：中（状況を見極めて）

| 状況 | 理由 |
|------|------|
| **他のAIプロバイダー追加** | Google Gemini等を追加する際、統一されたインターフェースが欲しい場合 |
| **開発リソースの制約** | 自前実装のメンテナンス工数を削減したい場合 |
| **コミュニティ標準への準拠** | Vercel AI SDKが事実上の標準になった場合 |

#### 3. 優先度：低（現状維持でよい）

| 状況 | 対応 |
|------|------|
| **軽微な機能追加** | 自前実装で対応 |
| **パフォーマンス改善** | 直接APIの方が制御しやすいため |
| **細かい挙動のカスタマイズ** | 直接APIの方が柔軟 |

### 移行の判断基準

```
移行すべきかのチェックリスト:

□ xAI APIに破壊的変更があり、自前実装の修正が困難
□ Vercel AI SDKがxAIの新機能を迅速にサポート
□ 他のAIプロバイダー（Gemini等）を統一的に扱いたい
□ 自前実装のメンテナンス工数が許容できない
□ セキュリティ監査で自前実装に問題が指摘された

上記のいずれかに該当する場合、移行を検討する。
```

### 移行工数の見積もり（参考）

| 項目 | 工数 |
|------|------|
| パッケージインストール・設定 | 30分 |
| `lib/llm/clients/grok.ts` の置き換え | 4時間 |
| SSEイベント形式の変換アダプター | 3時間 |
| フロントエンドの調整 | 2時間 |
| テスト・動作確認 | 3時間 |
| **合計** | **約12時間** |

### 結論

**現時点では移行不要**。直接API実装は十分に機能しており、Vercel AI SDKへの移行によるメリットは限定的。ただし、xAI APIの変更や他プロバイダー追加の際に再評価する。
