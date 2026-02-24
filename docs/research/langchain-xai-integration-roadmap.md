# LangChain xAI ツール統合ロードマップ

> **調査日**: 2026-02-24
> **ステータス**: 開発中（時期未定）

---

## 概要

LangChain（Python/TypeScript）でxAI Agent Tools（x_search, web_search, code_execution）が使用可能になる予定についての調査レポート。

---

## 現状

### LangChain Python

| 項目 | 状況 |
|------|------|
| **パッケージ** | `langchain-xai` (v1.2.1) |
| **対応API** | Chat Completions API のみ |
| **Responses API** | ❌ 未対応 |
| **x_search等** | ❌ 未対応 |

### LangChain TypeScript

| 項目 | 状況 |
|------|------|
| **パッケージ** | `@langchain/xai` (v0.1.0〜v1.3.0) |
| **対応API** | Chat Completions API のみ |
| **Responses API** | ❌ 未対応 |
| **x_search等** | ❌ 未対応 |

---

## 背景：Live Searchの廃止

xAIは2025年12月15日に **Live Search APIを廃止**し、**Agent Tools API**に移行しました。

```
エラーメッセージ:
"Live search is deprecated. Please switch to the Agent Tools API"
```

これにより、LangChain側でも対応が急務となっています。

---

## 開発状況

### GitHub Issue

| Issue | 内容 | ステータス |
|-------|------|-----------|
| #34906 | Live Search廃止への対応 | オープン |
| #33961 | Agent Tools APIへの移行要請 | オープン |

### 進行状況

- **LangChain Python**: Agent Tools API対応を開発中
- **LangChain TypeScript**: v1.3.0で「New server-side tools expand autonomous capabilities for OpenAI's Responses API」との記載あり
- **優先度**: Live Search廃止により高優先度

### 公式発言

> 「Agent Tools API対応は現在進行中ですが、具体的なリリース時期は未定です。」
> — LangChainコミュニティ

---

## 将来の展望

### 対応後の使用例（予想）

```python
# LangChain Python（対応後の予想）
from langchain_xai import ChatXAI
from langchain_xai.tools import x_search, web_search, code_execution

llm = ChatXAI(model="grok-4-1-fast")
llm_with_tools = llm.bind_tools([x_search, web_search, code_execution])

response = llm_with_tools.invoke("Search X for AI news")
```

```typescript
// LangChain TypeScript（対応後の予想）
import { ChatXAI } from "@langchain/xai";
import { xSearch, webSearch, codeExecution } from "@langchain/xai/tools";

const llm = new ChatXAI({ model: "grok-4-1-fast" });
const llmWithTools = llm.bindTools([xSearch, webSearch, codeExecution]);

const response = await llmWithTools.invoke("Search X for AI news");
```

---

## 現時点での代替案

### 案1: xAI SDK直接使用（Python）

```python
from xai_sdk import Client
from xai_sdk.tools import web_search, x_search, code_execution

client = Client(api_key="...")
chat = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[web_search(), x_search(), code_execution()],
)
```

### 案2: Vercel AI SDK（TypeScript/Next.js）

```typescript
import { xai } from '@ai-sdk/xai';
import { streamText } from 'ai';

const result = streamText({
  model: xai.responses('grok-4-1-fast'),
  tools: {
    web_search: xai.tools.webSearch(),
    x_search: xai.tools.xSearch(),
    code_execution: xai.tools.codeExecution(),
  },
});
```

### 案3: OpenAI SDK + xAI base_url

```python
from openai import OpenAI

client = OpenAI(
    api_key="xai-...",
    base_url="https://api.x.ai/v1"
)

# Responses API経由でxAIツールを使用
response = client.responses.create(
    model="grok-4-1-fast",
    tools=[{"type": "x_search"}],
    input="Search X for AI news"
)
```

---

## 結論

| 項目 | 判断 |
|------|------|
| **LangChainでxAIツールが使える見込み** | ✅ **あり（時期未定）** |
| **現在の対応状況** | Chat Completionsのみ |
| **Responses API対応** | 開発中（優先度：高） |
| **推奨アプローチ（現時点）** | **Vercel AI SDK** |

### 推奨方針

1. **今すぐxAIツールを使いたい** → Vercel AI SDKを使用
2. **LangChain統合を待ちたい** → 時期未定（数週間〜数ヶ月の可能性）
3. **将来的な統合を見据えたい** → Vercel AI SDKで実装し、LangChain対応後に移行検討

---

## 参考リンク

- [LangChain Python GitHub](https://github.com/langchain-ai/langchain)
- [LangChain TypeScript GitHub](https://github.com/langchain-ai/langchainjs)
- [xAI Agent Tools API Docs](https://docs.x.ai/docs/agent-tools)
- [Vercel AI SDK xAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai)

---

## 検証結果（2026-02-24）

### 検証バージョン
- `@langchain/xai`: 1.3.5

### 検証結果

| 項目 | 結果 |
|------|------|
| **ChatXAI** | ✅ 動作（Chat Completions API） |
| **ChatXAIResponses** | ✅ 存在確認 |
| **xaiXSearch等のツール関数** | ✅ 存在するが**動作しない** |
| **エラー** | `unknown variant 'x_search', expected 'function' or 'live_search'` |

### 問題の本質

```
LangChain (@langchain/xai 1.3.5)
    ↓
Chat Completions API (/v1/chat/completions)
    ↓
tools: [{type: "x_search"}]  ← xAIは拒否
    ↓
Error: unknown variant `x_search`
```

xAIの組み込みツールは **Responses API のみ** でサポート。

### 結論

**LangChainではまだxAIツールは使えない**。

| 選択肢 | 推奨度 |
|--------|--------|
| **Vercel AI SDK** | ⭐⭐⭐ **強く推奨** |
| LangChain | ❌ 未対応 |
| 直接API呼び出し | ⭐⭐ 工数がかかる |

---

## 参考リンク

- [LangChain Python GitHub](https://github.com/langchain-ai/langchain)
- [LangChain TypeScript GitHub](https://github.com/langchain-ai/langchainjs)
- [xAI Agent Tools API Docs](https://docs.x.ai/docs/agent-tools)
- [Vercel AI SDK xAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai)
- [LangChain xAI 検証結果](./langchain-xai-verification-result.md)

---

## 履歴

| 日付 | 内容 |
|------|------|
| 2026-02-24 | 初版作成 |
| 2026-02-24 | 検証結果を追加 |
