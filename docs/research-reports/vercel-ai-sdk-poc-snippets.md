# Vercel AI SDK PoC コードスニペット

> **調査日**: 2026-02-24
> **用途**: 実装時の参考コード

---

## 基本パターン

### 単一ツール使用

```typescript
import { xai } from '@ai-sdk/xai';
import { streamText } from 'ai';

const result = streamText({
  model: xai.responses('grok-4-1-fast'),
  prompt: 'Search X for AI news.',
  tools: {
    x_search: xai.tools.xSearch(),
  },
});

for await (const part of result.fullStream) {
  if (part.type === 'text-delta') {
    process.stdout.write(part.textDelta);
  }
}
```

### 複数ツール使用

```typescript
const result = streamText({
  model: xai.responses('grok-4-1-fast'),
  prompt: 'Research AI trends.',
  tools: {
    web_search: xai.tools.webSearch(),
    x_search: xai.tools.xSearch(),
    code_execution: xai.tools.codeExecution(),
  },
});
```

### ツールパラメータ指定

```typescript
const result = streamText({
  model: xai.responses('grok-4-1-fast'),
  prompt: 'Search for AI news.',
  tools: {
    web_search: xai.tools.webSearch({
      allowedDomains: ['arxiv.org', 'openai.com'],
      enableImageUnderstanding: true,
    }),
    x_search: xai.tools.xSearch({
      allowedXHandles: ['elonmusk', 'xai'],
      fromDate: '2025-01-01',
      toDate: '2025-12-31',
    }),
  },
});
```

---

## イベントハンドリング

### 全イベント取得

```typescript
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'start':
      console.log('Stream started');
      break;
      
    case 'tool-input-start':
      console.log(`Tool started: ${part.toolName}`);
      break;
      
    case 'tool-input-delta':
      // ★ ツール入力内容を取得
      console.log(`Input: ${part.delta}`);
      break;
      
    case 'tool-input-end':
      console.log('Tool input complete');
      break;
      
    case 'tool-call':
      console.log(`Tool called: ${part.toolName}`);
      break;
      
    case 'tool-result':
      console.log(`Tool result: ${part.toolCallId}`);
      break;
      
    case 'text-start':
      console.log('Text generation started');
      break;
      
    case 'text-delta':
      process.stdout.write(part.textDelta);
      break;
      
    case 'finish':
      console.log('Stream finished');
      console.log('Usage:', part.totalUsage);
      break;
      
    case 'error':
      console.error('Error:', part.error);
      break;
  }
}
```

### ツール使用状況の追跡

```typescript
const toolUsage: Record<string, number> = {};
const toolInputs: Record<string, string> = {};

for await (const part of result.fullStream) {
  switch (part.type) {
    case 'tool-input-start':
      toolInputs[part.id] = '';
      break;
      
    case 'tool-input-delta':
      toolInputs[part.id] += part.delta;
      break;
      
    case 'tool-call':
      toolUsage[part.toolName] = (toolUsage[part.toolName] || 0) + 1;
      console.log(`Tool: ${part.toolName}`);
      console.log(`Input: ${toolInputs[part.toolCallId]}`);
      break;
  }
}

console.log('Tool usage summary:', toolUsage);
```

---

## Next.js統合

### Route Handler

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

### Reactフック

```typescript
// hooks/useChat.ts
'use client';

import { useChat as useVercelChat } from '@ai-sdk/react';

export function useChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = 
    useVercelChat({
      api: '/api/chat',
    });
  
  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
}
```

### Reactコンポーネント

```typescript
// components/Chat.tsx
'use client';

import { useChat } from '@/hooks/useChat';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  
  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      
      {isLoading && <div>考え中...</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="メッセージを入力..."
        />
        <button type="submit">送信</button>
      </form>
    </div>
  );
}
```

---

## エラーハンドリング

### 基本的なエラー処理

```typescript
try {
  const result = streamText({
    model: xai.responses('grok-4-1-fast'),
    prompt: 'Hello',
  });
  
  for await (const part of result.fullStream) {
    if (part.type === 'error') {
      console.error('Stream error:', part.error);
    }
  }
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

### API Key検証

```typescript
function validateApiKey(apiKey: string): boolean {
  return apiKey.startsWith('xai-') && apiKey.length > 20;
}

// 使用例
if (!validateApiKey(process.env.XAI_API_KEY || '')) {
  throw new Error('Invalid XAI_API_KEY format');
}
```

---

## コスト計算

### 使用量取得

```typescript
let finalUsage: any = null;

for await (const part of result.fullStream) {
  if (part.type === 'finish') {
    finalUsage = part.totalUsage;
  }
}

console.log({
  inputTokens: finalUsage?.inputTokens,
  outputTokens: finalUsage?.outputTokens,
  reasoningTokens: finalUsage?.reasoningTokens,
  totalTokens: finalUsage?.totalTokens,
  toolCalls: finalUsage?.raw?.num_server_side_tools_used,
});
```

### コスト計算関数

```typescript
interface Usage {
  inputTokens: number;
  outputTokens: number;
  toolCalls?: number;
}

function calculateCost(usage: Usage): number {
  // xAI Grok pricing: $0.20/1M input, $0.50/1M output
  // Tool usage: max $5/1000 calls
  const inputCost = usage.inputTokens * 0.20 / 1000000;
  const outputCost = usage.outputTokens * 0.50 / 1000000;
  const toolCost = (usage.toolCalls || 0) * 5 / 1000;
  
  return inputCost + outputCost + toolCost;
}

// 使用例
const cost = calculateCost({
  inputTokens: 1000,
  outputTokens: 500,
  toolCalls: 2,
});
console.log(`Cost: $${cost.toFixed(6)}`);
```

---

## キャンセル処理

### AbortController使用

```typescript
const abortController = new AbortController();

const result = streamText({
  model: xai.responses('grok-4-1-fast'),
  prompt: 'Long task...',
  abortSignal: abortController.signal,
});

// 5秒後にキャンセル
setTimeout(() => {
  abortController.abort();
}, 5000);

try {
  for await (const part of result.fullStream) {
    // ...
  }
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('Stream aborted');
  }
}
```

---

## 参考

- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs)
- [xAI Provider Documentation](https://ai-sdk.dev/providers/ai-sdk-providers/xai)
