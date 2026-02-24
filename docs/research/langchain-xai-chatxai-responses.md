# ChatXAIResponses 検証レポート

> **検証日**: 2026-02-24
> **バージョン**: `@langchain/xai@1.3.5`
> **ステータス**: 動作確認済み（制限あり）

---

## 概要

`@langchain/xai@1.3.5` に追加された `ChatXAIResponses` クラスは、
xAI Responses API (`/v1/responses`) を使用し、**xAI Agent Tools を自動的に使用できる**。

---

## 検証結果

### ✅ 動作確認済み

| 項目 | 結果 |
|------|------|
| **ChatXAIResponses** | ✅ 動作 |
| **x_search** | ✅ 自動使用（サーバーサイド） |
| **web_search** | ✅ 自動使用（サーバーサイド） |
| **code_execution** | ✅ 自動使用（サーバーサイド） |
| **ストリーミング** | ✅ 対応 |
| **複数ツール** | ✅ 自動選択・実行 |

### ⚠️ 制限事項

| 項目 | 内容 |
|------|------|
| **tool_calls** | フロントエンドに返されない（サーバーサイド実行） |
| **ツール入力内容** | 取得不可（クエリ内容が不明） |
| **ツール実行状況** | リアルタイム表示不可 |

---

## 使用例

### 基本的な使用

```typescript
import { ChatXAIResponses } from '@langchain/xai';
import { HumanMessage } from '@langchain/core/messages';

const llm = new ChatXAIResponses({
  model: 'grok-4-1-fast',
  apiKey: process.env.XAI_API_KEY,
});

const response = await llm.invoke([
  new HumanMessage('Search X for AI news')
]);

console.log(response.content);
// → X検索結果が含まれた回答
```

### ストリーミング

```typescript
const llm = new ChatXAIResponses({
  model: 'grok-4-1-fast',
  apiKey: process.env.XAI_API_KEY,
  streaming: true,
});

const stream = await llm.stream([
  new HumanMessage('Search X for AI news')
]);

for await (const chunk of stream) {
  process.stdout.write(chunk.content || '');
}
```

---

## 動作の違い

### ChatXAI (Chat Completions API)

```typescript
const llm = new ChatXAI({ model: 'grok-4-1-fast' });
const llmWithTools = llm.bindTools([xSearchTool]);

// ツール呼び出しをフロントエンドで処理
const response = await llmWithTools.invoke([new HumanMessage('Search X')]);
// → tool_calls が返る（フロントエンドで実行）
```

### ChatXAIResponses (Responses API)

```typescript
const llm = new ChatXAIResponses({ model: 'grok-4-1-fast' });

// ツールをサーバーサイドで自動実行
const response = await llm.invoke([new HumanMessage('Search X')]);
// → ツール実行結果を含む回答が返る（tool_calls は返らない）
```

---

## 重要な違い

| 機能 | ChatXAI | ChatXAIResponses |
|------|---------|------------------|
| **API** | Chat Completions | Responses |
| **ツール実行** | クライアントサイド | サーバーサイド |
| **tool_calls** | ✅ 返される | ❌ 返されない |
| **ツール入力表示** | ✅ 可能 | ❌ 不可 |
| **xAI組み込みツール** | ❌ 使用不可 | ✅ 自動使用 |

---

## ユースケース別推奨

### ChatXAIResponses を使う場合

- ✅ シンプルなチャットボット
- ✅ ツール実行状況の表示が不要
- ✅ xAIの自動ツール選択を活用したい

### Vercel AI SDK を使う場合

- ✅ ツール実行状況をリアルタイム表示したい
- ✅ ツール入力内容を表示したい
- ✅ 細かい制御が必要

---

## 結論

**ChatXAIResponses は使用可能**だが、以下の制限がある：

1. ツール実行はサーバーサイドで完結（フロントエンドには tool_calls が返らない）
2. ツール入力内容の取得ができない
3. ツール実行中のインジケーター表示が困難

**推奨**: 
- シンプルな実装なら **ChatXAIResponses**
- 細かい制御が必要なら **Vercel AI SDK**

---

## 参考

- [@langchain/xai npm](https://www.npmjs.com/package/@langchain/xai)
- [xAI Responses API Docs](https://docs.x.ai/docs/responses-api)
