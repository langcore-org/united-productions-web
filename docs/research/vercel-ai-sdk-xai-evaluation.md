# Vercel AI SDK xAI 評価レポート

> **調査日**: 2026-02-24
> **調査者**: AI Agent
> **ステータス**: 評価完了 - 移行推奨

---

## 概要

xAI Agent Tools（x_search, web_search, code_execution）をVercel AI SDKで使用する場合の技術評価レポート。

---

## 検証環境

| 項目 | バージョン |
|------|-----------|
| `@ai-sdk/xai` | 3.0.57 (latest) |
| `ai` | 6.0.97 (latest) |
| Node.js | 20.x |

---

## 検証結果サマリー

### ✅ 動作確認済み

| 機能 | 結果 | 備考 |
|------|------|------|
| x_search | ✅ 動作 | 正常にX検索実行 |
| web_search | ✅ 動作 | 正常にWeb検索実行 |
| code_execution | ✅ 動作 | 正常にコード実行 |
| 複数ツール同時使用 | ✅ 動作 | 3ツール同時でも正常 |
| ストリーミング | ✅ 動作 | SSEストリーム正常 |
| ツール呼び出しイベント | ✅ 取得可能 | `tool-call`, `tool-input-delta`等 |
| 使用量取得 | ✅ 可能 | トークン数・ツール使用回数 |
| Reasoningトークン | ✅ 取得可能 | `reasoningTokens`フィールド |

### ⚠️ 注意点

| 項目 | 内容 | 対応策 |
|------|------|--------|
| Invalid API Key | エラーイベントなし | 事前バリデーション推奨 |
| Stream Abort | `error`イベントなし | フロントエンドで制御 |
| ツール入力内容 | `tool-call.input`は空 | `tool-input-delta`で取得 |

---

## 詳細検証結果

### 1. ツール呼び出しイベント

取得できるイベント一覧：

```typescript
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'start':                    // ストリーム開始
    case 'start-step':               // ステップ開始
    case 'tool-input-start':         // ツール入力開始
    case 'tool-input-delta':         // ツール入力差分（★クエリ取得）
    case 'tool-input-end':           // ツール入力終了
    case 'tool-call':                // ツール呼び出し
    case 'tool-call-streaming-start':// ツールストリーミング開始
    case 'tool-result':              // ツール結果
    case 'text-start':               // テキスト開始
    case 'text-delta':               // テキスト差分（回答本文）
    case 'finish':                   // 完了
    case 'error':                    // エラー
    case 'response-metadata':        // レスポンスメタデータ
  }
}
```

### 2. ツール入力内容の取得

```typescript
// ✅ 正しい方法：tool-input-delta で取得
case 'tool-input-delta':
  console.log(part.delta); // {"query":"AI","limit":10}
  break;

// ❌ 注意：tool-call の input は空
// case 'tool-call':
//   console.log(part.input); // {}（空オブジェクト）
```

### 3. 使用量・コスト計算

```typescript
case 'finish':
  const usage = part.totalUsage;
  console.log({
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.reasoningTokens,
    totalTokens: usage.totalTokens,
    // ツール使用回数
    toolCalls: usage.raw.num_server_side_tools_used,
  });
  
  // コスト計算（$0.20/1M input, $0.50/1M output, max $5/1000 tools）
  const cost = (usage.inputTokens * 0.20 / 1000000) + 
               (usage.outputTokens * 0.50 / 1000000) +
               (toolCalls * 5 / 1000);
  break;
```

### 4. 複数ツール同時使用

```typescript
const result = streamText({
  model: xai.responses('grok-4-1-fast'),
  prompt: 'Research AI: search web, search X, and calculate.',
  tools: {
    web_search: xai.tools.webSearch(),
    x_search: xai.tools.xSearch(),
    code_execution: xai.tools.codeExecution(),
  },
});
// ✅ 正常に動作。3ツールすべて実行される。
```

---

## 実装パターン

### 基本的な使用例

```typescript
import { xai } from '@ai-sdk/xai';
import { streamText } from 'ai';

const result = streamText({
  model: xai.responses('grok-4-1-fast'),
  prompt: 'Search X for AI news.',
  tools: {
    x_search: xai.tools.xSearch({
      allowedXHandles: ['elonmusk', 'xai'],
    }),
  },
});

for await (const part of result.fullStream) {
  switch (part.type) {
    case 'text-delta':
      process.stdout.write(part.textDelta);
      break;
    case 'tool-call':
      console.log(`Tool: ${part.toolName}`);
      break;
    case 'finish':
      console.log('Usage:', part.totalUsage);
      break;
  }
}
```

### Next.js Route Handler

```typescript
// app/api/chat/route.ts
import { xai } from '@ai-sdk/xai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: xai.responses('grok-4-1-fast'),
    messages,
    tools: {
      web_search: xai.tools.webSearch(),
      x_search: xai.tools.xSearch(),
      code_execution: xai.tools.codeExecution(),
    },
  });
  
  return result.toDataStreamResponse();
}
```

### Reactフロントエンド

```typescript
// hooks/useChat.ts
import { useChat as useVercelChat } from '@ai-sdk/react';

export function useChat() {
  return useVercelChat({
    api: '/api/chat',
  });
}
```

---

## 移行工数見積もり

### 案A: Vercel AI SDK完全移行（推奨）

| 項目 | 工数 |
|------|------|
| パッケージインストール | 10分 |
| Route Handler修正 | 1h |
| フロントエンドフック修正 | 2h |
| ツールインジケーターUI修正 | 2h |
| テスト・動作確認 | 2h |
| **合計** | **約7時間** |

### 案B: ハイブリッド（既存SSE + Vercel AI SDK）

| 項目 | 工数 |
|------|------|
| パッケージインストール | 10分 |
| 変換アダプター実装 | 3h |
| テスト・動作確認 | 2h |
| **合計** | **約5時間** |

---

## 推奨事項

### ✅ Vercel AI SDKへの移行を推奨

**理由**:
1. xAI Agent Toolsが正常に動作
2. 実装がシンプルで工数が少ない
3. 公式サポート・メンテナンスが期待できる
4. 他プロバイダー（Gemini等）追加が容易

**注意点**:
- ツール入力内容は `tool-input-delta` で取得
- API Keyエラーは事前バリデーションで対応

---

## バグ修正履歴

### Issue #10628 - `streamText fails with x_search`

| 項目 | 内容 |
|------|------|
| **オープン** | 2025-11-26 |
| **クローズ** | 2026-01-06 |
| **修正PR** | [#10765](https://github.com/vercel/ai/pull/10765) |
| **修正バージョン** | `@ai-sdk/xai 3.0.9` |
| **修正内容** | `response.custom_tool_call_input.delta` イベント型をZodスキーマに追加 |

**これはx_searchが動作し始めた最初の修正**です。

### Issue #11999 - `xAI completely broken`

| 項目 | 内容 |
|------|------|
| **オープン** | 2026-01-23 |
| **ステータス** | 未クローズ（オープンのまま） |
| **関連PR** | #12004, #12301, #12456 |
| **主な修正** | `@ai-sdk/xai 3.0.54`（2026-02-11） |

**複数の問題を包括的に修正**：
- `usage: null` 問題
- `function_call_arguments` イベント未対応

### タイムライン

```
2025-11-26  Issue #10628 オープン
2026-01-06  Issue #10628 修正 (v3.0.9) ← x_search が動作開始
2026-01-23  Issue #11999 オープン
2026-02-11  Issue #11999 関連修正 (v3.0.54) ← 安定化
2026-02-24  現在 (v3.0.57) ← 最新版、両方の修正含む
```

### 結論

| 質問 | 回答 |
|------|------|
| x_search が動作し始めたのはいつ | **2026-01-06**（v3.0.9） |
| 安定し始めたのはいつ | **2026-02-11**（v3.0.54）以降 |
| 現在の最新版は安定しているか | **はい**（v3.0.57） |

**注意**: Issue #11999 はまだGitHub上でオープンのままですが、**実際には修正済み**です。複数のPRで段階的に修正され、v3.0.54以降で安定しています。

---

## 参考リンク

- [xAI Grok Provider - AI SDK Docs](https://ai-sdk.dev/providers/ai-sdk-providers/xai)
- [Vercel AI SDK GitHub](https://github.com/vercel/ai)
- [xAI Responses API Docs](https://docs.x.ai/docs/responses-api)
- [Issue #10628](https://github.com/vercel/ai/issues/10628)
- [Issue #11999](https://github.com/vercel/ai/issues/11999)

---

## 履歴

| 日付 | 内容 |
|------|------|
| 2026-02-24 | 初版作成 |
| 2026-02-24 | バグ修正履歴を追加 |
