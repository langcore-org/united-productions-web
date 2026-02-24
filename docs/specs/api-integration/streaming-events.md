# ストリーミングイベント仕様

> **LLMストリーミング時のイベント定義とデータフロー**
> 
> **最終更新**: 2026-02-23 22:00

---

## 概要

LangChainのAgent/Tool機能を活用し、AIの思考プロセスをリアルタイムで可視化する仕様。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│  Client                                                          │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ FeatureChat     │───→│ useLLMStream    │                     │
│  │ (UI表示)        │←───│ (イベント処理)   │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                   │                              │
└───────────────────────────────────┼──────────────────────────────┘
                                    │ SSE
┌───────────────────────────────────┼──────────────────────────────┐
│  Server                           ↓                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ POST /api/llm/stream                                    │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │    │
│  │  │ AgentExecutor│───→│ Tool Calling│───→│ LLM Stream │ │    │
│  │  │ (LangChain) │←───│ (ツール実行) │←───│ (応答生成) │ │    │
│  │  └──────┬──────┘    └─────────────┘    └─────────────┘ │    │
│  │         │                                              │    │
│  │         ↓ コールバックでイベント送信                      │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ Agent Callback Handler                          │   │    │
│  │  │  - onLLMStart: stepStart イベント               │   │    │
│  │  │  - onToolStart: toolCallEvent イベント          │   │    │
│  │  │  - onToolEnd: toolCallEvent (completed)         │   │    │
│  │  │  - onLLMNewToken: stepUpdate / content イベント │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## イベント一覧

| イベント | タイミング | 送信元 |
|---------|-----------|--------|
| `accepted` | リクエスト受理直後 | API Route |
| `stepStart` | LLMが思考を開始 | Agent Callback (onLLMStart) |
| `toolCallEvent` | ツール呼び出し開始 | Agent Callback (onToolStart) |
| `toolCallEvent` | ツール呼び出し完了 | Agent Callback (onToolEnd) |
| `stepUpdate` | 思考内容の更新 | Agent Callback (onLLMNewToken) |
| `stepComplete` | 思考ステップ完了 | Agent Callback (onLLMEnd) |
| `content` | 最終回答のチャンク | Agent Callback (onLLMNewToken) |
| `done` | 全処理完了 | API Route |

## イベント詳細

### accepted

```typescript
{ accepted: true }
```

### stepStart

```typescript
{
  stepStart: {
    step: 1,
    id: "agent-step-1",
    title: "分析と計画",
    status: "running",
    type: "thinking"
  }
}
```

### toolCallEvent

```typescript
// 開始時
{
  toolCallEvent: {
    id: "tool-1-web_search",
    type: "web_search",
    name: "Web検索",
    input: "マツコの知らない世界 過去出演者",
    status: "running"
  }
}

// 完了時
{
  toolCallEvent: {
    id: "tool-1-web_search",
    type: "web_search",
    name: "Web検索",
    input: "マツコの知らない世界 過去出演者",
    status: "completed"
  }
}
```

### stepUpdate

```typescript
{
  stepUpdate: {
    id: "agent-step-1",
    content: "ユーザーの質問を分析しています..."
  }
}
```

### content

```typescript
{ content: "回答の一部..." }
```

### done

```typescript
{
  done: true,
  usage: {
    inputTokens: 1000,
    outputTokens: 500,
    cost: 0.001
  }
}
```

## LangChain統合

### AgentExecutor の設定

```typescript
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

// カスタムコールバックハンドラー
class StreamingCallbackHandler extends BaseCallbackHandler {
  constructor(private onEvent: (event: StreamingEvent) => void) {
    super();
  }

  async onLLMStart(runId: string, prompts: string[]) {
    this.onEvent({
      stepStart: { step: 1, id: runId, title: '思考', status: 'running', type: 'thinking' }
    });
  }

  async onToolStart(runId: string, tool: Tool) {
    this.onEvent({
      toolCallEvent: { id: runId, type: tool.name, name: tool.name, status: 'running' }
    });
  }

  async onToolEnd(runId: string, output: string) {
    this.onEvent({
      toolCallEvent: { id: runId, type: 'web_search', name: 'Web検索', status: 'completed' }
    });
  }

  async onLLMNewToken(runId: string, token: string) {
    this.onEvent({ stepUpdate: { id: runId, content: token } });
  }
}
```

## 関連ファイル

- `lib/llm/types.ts` - 型定義
- `lib/llm/sse-parser.ts` - SSEパーサー
- `lib/llm/langchain/agents/streaming.ts` - ストリーミングAgent実装
- `lib/llm/langchain/callbacks/streaming.ts` - カスタムコールバック
- `app/api/llm/stream/route.ts` - APIエンドポイント
- `hooks/useLLMStream/` - ストリーミングフック
- `components/chat/StreamingSteps.tsx` - ストリーミングUI
- `components/chat/FeatureChat.tsx` - チャットUI
