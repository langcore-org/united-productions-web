# LangChain xAI 検証結果（2026-02-24）

## 検証バージョン
- `@langchain/xai`: 1.3.5 (latest)
- `@langchain/core`: 1.1.27

---

## 検証結果サマリー

### ✅ 確認できたこと

| 項目 | 結果 |
|------|------|
| **ChatXAI** | ✅ 動作（Chat Completions API） |
| **ChatXAIResponses** | ✅ 存在確認（Responses API用） |
| **ツール関数の存在** | ✅ 確認（`xaiXSearch`, `xaiWebSearch`, `xaiCodeExecution`） |
| **ツール呼び出し検出** | ✅ `bindTools()` で検出可能 |

### ❌ 確認された問題

| 項目 | 結果 |
|------|------|
| **xAIツールの使用** | ❌ **エラー発生** |
| **エラー内容** | `unknown variant 'x_search', expected 'function' or 'live_search'` |

---

## 詳細検証結果

### 1. エクスポートされている関数

```typescript
// @langchain/xai からエクスポートされているもの
{
  ChatXAI,           // Chat Completions API用
  ChatXAIResponses,  // Responses API用（新規）
  isXAIBuiltInTool,  // 組み込みツール判定
  tools: {           // ツール関数群
    xaiLiveSearch,      // ⚠️ 廃止済み
    xaiWebSearch,       // xAI組み込みツール
    xaiXSearch,         // xAI組み込みツール
    xaiCodeExecution,   // xAI組み込みツール
    xaiCollectionsSearch
  }
}
```

### 2. エラーの詳細

```
422 Failed to deserialize the JSON body into the target type: 
tools[0].type: unknown variant `x_search`, 
expected `function` or `live_search`
```

**原因**:
- LangChainは `tools[0].type: "x_search"` を送信
- xAI APIは `"function"` または `"live_search"` のみを期待
- **Responses API vs Chat Completions API のミスマッチ**

### 3. 動作したケース

```typescript
// ✅ 動作：カスタムツール定義
const tools = [{
  type: 'function',
  function: {
    name: 'x_search',
    description: 'Search X',
    parameters: { ... }
  }
}];

const llmWithTools = llm.bindTools(tools);
const response = await llmWithTools.invoke([new HumanMessage('Search X')]);
// → tool_calls が返る（ただし実際には実行されない）
```

```
✅ Tool calls detected!
  - x_search: { query: "AI news" }
```

---

## 結論

### 現状の判断

| 項目 | 状況 |
|------|------|
| **LangChainでxAIツールが使えるか** | ❌ **まだ使えない** |
| **問題の本質** | APIプロトコルのミスマッチ |
| **ChatXAIResponses** | 存在するが `bindTools()` 非対応 |
| **xaiXSearch等** | 存在するがAPIエラー |

### 技術的な問題

```
LangChain (@langchain/xai 1.3.5)
    ↓
Chat Completions API (/v1/chat/completions)
    ↓
tools: [{type: "x_search"}]  ← xAIは受け付けない
    ↓
Error: unknown variant `x_search`

正しいプロトコル（Responses API）:
tools: [{type: "x_search"}]  ← /v1/responses では受け付ける
```

### 推奨アプローチ

| 選択肢 | 状況 |
|--------|------|
| **Vercel AI SDK** | ✅ **推奨** - 完全に動作 |
| **LangChain** | ❌ 未対応（開発中） |
| **直接API呼び出し** | ✅ 動作するが工数がかかる |

---

## 参考

- エラーは `x_search` 等の組み込みツールタイプが
  Chat Completions APIではサポートされていないため発生
- Responses API (`ChatXAIResponses`) では正しく動作する可能性があるが、
  `bindTools()` メソッドが未実装

---

## 履歴

| 日付 | 内容 |
|------|------|
| 2026-02-24 | 検証実施 |
