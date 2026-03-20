# 会話コンテキスト管理フロー

> **Memory → Summarization → SystemPrompt のend-to-endデータフロー**
>
> **最終更新**: 2026-03-20 14:35

---

## 概要

本ドキュメントは、ユーザー入力からLLM送信までの会話コンテキスト管理の全体フローを説明します。3つの主要コンポーネントが連携して、長時間の会話でも文脈を維持します。

### コンポーネント構成

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#e1f5fe', 'primaryTextColor': '#01579b', 'primaryBorderColor': '#0288d1', 'lineColor': '#0288d1', 'secondaryColor': '#fff3e0', 'tertiaryColor': '#e8f5e9', 'background': '#fafafa'}}}%%
flowchart LR
    subgraph Input["📥 入力"]
        User[ユーザー入力]
    end
    
    subgraph Processing["⚙️ 処理"]
        direction TB
        CM[ClientMemory<br/>メモリ管理]
        SUM[Summarize API<br/>要約生成]
        SP[SystemPrompt<br/>プロンプト構築]
    end
    
    subgraph Output["📤 出力"]
        LLM[LLM送信]
    end
    
    User --> CM
    CM -.->|要約必要| SUM
    SUM -.->|要約返却| CM
    CM -->|context| SP
    SP --> LLM
    
    style CM fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b
    style SUM fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
    style SP fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20
    style User fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c
    style LLM fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#880e4f
```

---

## 責任分界

| コンポーネント | 責任 | 所在 |
|-------------|------|------|
| **ClientMemory** | メッセージ管理・トークン計算・要約トリガー | `lib/llm/memory/client-memory.ts` |
| **Summarize API** | プロンプト構築・LLM呼び出し・要約生成 | `app/api/llm/summarize/route.ts` |
| **SystemPrompt** | プロンプト構築・要約統合・LLM送信 | `lib/prompts/system-prompt.ts`<br/>`app/api/llm/stream/route.ts` |

---

## シナリオ別フロー

### シナリオA: 新規会話（要約なし）

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#e1f5fe', 'primaryTextColor': '#01579b', 'primaryBorderColor': '#0288d1', 'lineColor': '#0288d1', 'secondaryColor': '#fff3e0', 'tertiaryColor': '#e8f5e9', 'background': '#fafafa'}}}%%
sequenceDiagram
    actor User as 👤 ユーザー
    participant UI as 💻 ChatUI
    participant CM as 🧠 ClientMemory
    participant SP as 📝 SystemPrompt
    participant API as ⚡ LLM API
    
    User->>UI: "こんにちは"
    UI->>CM: addMessage(user)
    Note over CM: トークン数: 低<br/>要約不要
    
    CM->>UI: return context<br/>(messages only, no summary)
    
    UI->>SP: buildSystemPrompt(programId, featureId)
    Note over SP: 基本プロンプト構築<br/>要約なし
    
    SP->>API: stream(messagesWithSystem)
    Note over API: messages[0]:<br/>{ role: "system",<br/>content: basePrompt }
    
    API-->>UI: ストリーミング応答
    UI-->>User: "こんにちは！"
```

### シナリオB: 継続会話（要約あり）

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#e1f5fe', 'primaryTextColor': '#01579b', 'primaryBorderColor': '#0288d1', 'lineColor': '#0288d1', 'secondaryColor': '#fff3e0', 'tertiaryColor': '#e8f5e9', 'background': '#fafafa'}}}%%
sequenceDiagram
    actor User as 👤 ユーザー
    participant UI as 💻 ChatUI
    participant CM as 🧠 ClientMemory
    participant SUM as 🔧 Summarize API
    participant SP as 📝 SystemPrompt
    participant API as ⚡ LLM API
    
    User->>UI: "前回の話の続き..."
    UI->>CM: addMessage(user)
    Note over CM: トークン数: 閾値超過<br/>要約実行
    
    CM->>SUM: POST /api/llm/summarize<br/>{ messages, targetTokens, existingSummary }
    Note over SUM: existingSummary:<br/>"ユーザーと挨拶を交わした..."
    
    SUM->>SUM: buildSummaryPrompt()
    SUM->>API: LLM呼び出し
    API-->>SUM: 新しい要約
    SUM-->>CM: return { summary }
    Note over CM: 累積要約を更新
    
    CM->>UI: return context<br/>(recent messages + summary)
    
    UI->>SP: buildSystemPrompt(programId, featureId)
    SP->>SP: 要約メッセージ検出・統合
    Note over SP: basePrompt + "---" + summary
    
    SP->>API: stream(messagesWithSystem)
    Note over API: messages[0]:<br/>{ role: "system",<br/>content: integratedPrompt }
    
    API-->>UI: ストリーミング応答
    UI-->>User: "前回の話の続きですね..."
```

### シナリオC: 長時間会話（累積要約）

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#e1f5fe', 'primaryTextColor': '#01579b', 'primaryBorderColor': '#0288d1', 'lineColor': '#0288d1', 'secondaryColor': '#fff3e0', 'tertiaryColor': '#e8f5e9', 'background': '#fafafa'}}}%%
sequenceDiagram
    actor User as 👤 ユーザー
    participant CM as 🧠 ClientMemory
    participant SUM as 🔧 Summarize API
    participant SP as 📝 SystemPrompt
    
    Note over CM: 初期状態<br/>summary: ""
    
    loop 1回目の要約
        CM->>SUM: summarize({ existingSummary: "" })
        SUM-->>CM: summary: "A社の企画について議論"
    end
    
    Note over CM: 累積要約<br/>summary: "A社の企画について議論"
    
    loop 2回目の要約
        CM->>SUM: summarize({ existingSummary: "A社の企画について議論" })
        Note over SUM: プロンプトに既存要約を含める
        SUM-->>CM: summary: "A社の企画について議論し、B案を採用"
    end
    
    Note over CM: 累積要約（文脈継承）<br/>summary: "A社の企画について議論し、B案を採用"
    
    CM->>SP: getContext()
    Note over SP: システムプロンプトに<br/>累積要約を統合
    SP->>SP: basePrompt + "---" + "A社の...B案を採用"
```

---

## データ構造の変遷

### Stage 1: ClientMemory内

```typescript
// 新規会話時
{
  messages: [
    { role: "user", content: "こんにちは" },
    { role: "assistant", content: "こんにちは！" }
  ],
  summary: "",
  metadata: { totalMessages: 2, summaryTokens: 0, recentTokens: 50 }
}

// 要約後
{
  messages: [],  // 要約済みメッセージはクリア
  summary: "ユーザーと挨拶を交わした。",
  metadata: { totalMessages: 0, summaryTokens: 20, recentTokens: 0 }
}

// 新メッセージ追加後
{
  messages: [
    { role: "user", content: "今日の天気は？" }
  ],
  summary: "ユーザーと挨拶を交わした。",
  metadata: { totalMessages: 1, summaryTokens: 20, recentTokens: 15 }
}
```

### Stage 2: SystemPrompt構築時

```typescript
// 要約なしの場合
const messagesWithSystem = [
  { role: "system", content: basePrompt },
  { role: "user", content: "こんにちは" }
];

// 要約ありの場合
const messagesWithSystem = [
  { 
    role: "system", 
    content: `${basePrompt}\n\n---\n\nこれまでの会話の要約：ユーザーと挨拶を交わした。`
  },
  { role: "user", content: "今日の天気は？" }
];
```

---

## 統合ポイント詳細

### 1. ClientMemory → Summarize API

```typescript
// ClientMemory.updateSummary()
const response = await fetch("/api/llm/summarize", {
  method: "POST",
  body: JSON.stringify({
    messages: this.messages,           // 要約対象
    provider: this.provider,           // LLMプロバイダー
    targetTokens: calculatedTokens,    // 動的圧縮率で計算
    existingSummary: this.summary,     // 累積要約の文脈
  }),
});
```

### 2. Summarize API → GrokClient

```typescript
// app/api/llm/summarize/route.ts
const prompt = buildSummaryPrompt(
  messages,
  targetChars,
  existingSummary  // 累積要約をプロンプトに含める
);

const client = new GrokClient(provider);
const summary = await client.summarizeWithPrompt(prompt);
```

### 3. ClientMemory → SystemPrompt

```typescript
// hooks/useLLMStream/index.ts
const context = memory.getContext();
// { messages, summary, metadata }

// app/api/llm/stream/route.ts
const baseSystemPrompt = await buildSystemPrompt({ 
  programId, 
  featureId,
  userId 
});

// 要約メッセージを検出・統合
const summaryMessage = messages.find(
  m => m.role === "system" && m.content.startsWith("これまでの会話の要約")
);

const systemPrompt = summaryMessage
  ? `${baseSystemPrompt}\n\n---\n\n${summaryMessage.content}`
  : baseSystemPrompt;
```

---

## エラーフロー

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#e1f5fe', 'primaryTextColor': '#01579b', 'primaryBorderColor': '#0288d1', 'lineColor': '#0288d1', 'secondaryColor': '#fff3e0', 'tertiaryColor': '#e8f5e9', 'background': '#fafafa'}}}%%
flowchart TD
    A[ユーザー入力] --> B[ClientMemory.addMessage]
    B --> C{要約必要?}
    C -->|はい| D[Summarize API呼び出し]
    C -->|いいえ| E[SystemPrompt構築]
    
    D --> F{API成功?}
    F -->|成功| G[要約更新]
    F -->|失敗| H[エラーハンドリング]
    
    G --> E
    H --> I[要約なしで継続]
    I --> E
    
    E --> J[LLM送信]
    
    style A fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b
    style D fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
    style H fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#b71c1c
    style J fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20
```

---

## パフォーマンス特性

| 項目 | 値 | 備考 |
|-----|-----|------|
| トークン計算 | O(n) | n=文字数 |
| 要約API呼び出し | ~500-2000ms | LLM応答時間依存 |
| メモリ使用量 | ~数MB | 会話履歴サイズ依存 |
| クライアントサイド処理 | <10ms | 要約除く |

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `lib/llm/memory/client-memory.ts` | ClientMemory実装 |
| `app/api/llm/summarize/route.ts` | 要約API |
| `lib/prompts/system-prompt.ts` | システムプロンプト構築 |
| `app/api/llm/stream/route.ts` | ストリーミングAPI（要約統合） |
| `hooks/useLLMStream/index.ts` | フック実装 |

---

## 関連ドキュメント

- [memory-management.md](./memory-management.md) - ClientMemory詳細設計
- [summarization-api.md](./summarization-api.md) - 要約API仕様
- [system-prompt-management.md](./system-prompt-management.md) - システムプロンプト管理

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-03-20 | 関連ドキュメントリンクを更新 |
| 2026-02-25 | 初版作成 |

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-02-25 | 初版作成 |
