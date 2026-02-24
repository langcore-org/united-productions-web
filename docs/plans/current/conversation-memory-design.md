# 会話記憶（Memory）設計書

> **AI Hubプロジェクトにおける会話履歴管理の設計**
>
> **作成日**: 2026-02-24  
> **更新日**: 2026-02-24  
> **ステータス**: 設計確定・実装待ち  
> **採用設計**: 閾値ベース Rolling Summary

---

## 1. 背景・目的

### 1.1 現状の課題

現在のAI Hubでは、**xAI Responses APIを直接呼び出す**設計に移行済み。Grokの2Mトークンという大きなコンテキストウィンドウを活かし、**全履歴を毎回送信**している。

```
【現状の動作】
全履歴（例：100ターン）→ xAI API → 100ターン分の課金
```

### 1.2 問題点

| 問題 | 詳細 |
|------|------|
| **コストの無駄** | 古い履歴（50ターン目以前）が課金対象になる |
| **レイテンシ** | 履歴が長くなるほどAPI応答が遅くなる |
| **スケーラビリティ** | 将来的に他のモデル（128K等）に移行した際に問題になる |
| **文脈欠落** | スライディングウィンドウだけでは10ターン以上前の文脈が失われる |

### 1.3 目的

- コストを削減しつつ、**長期文脈を保持**する
- **xAI API直接呼び出し**に統一された実装とする
- **バグりにくいシンプルな設計**とする

---

## 2. 各社の設計比較

### 2.1 概要

| 項目 | ChatGPT (OpenAI) | Claude (Anthropic) | Grok (xAI) | Gemini (Google) |
|------|------------------|-------------------|------------|-----------------|
| **コンテキスト** | 128K | 200K | **2M** | 1M |
| **記憶戦略** | **閾値ベース要約** | 3層メモリ | フル送信 | キャッシング |
| **永続化** | サーバー | クライアント | サーバー | サーバー |
| **強み** | バランス型 | 精密制御 | シンプル | 長文処理 |

### 2.2 詳細な設計

#### ChatGPT（OpenAI）- 参考にする設計

```
【閾値ベース Rolling Summary】

通常時（トークン数 < 閾値）
┌─────────────────────────────────────────┐
│ 全履歴をそのまま送信                     │
│ ユーザーの質問に応じて回答               │
└─────────────────────────────────────────┘
            ↓ トークン数が閾値（128K）に近づく
閾値超過時（トークン数 >= 閾値）
┌─────────────────────────────────────────┐
│ 【要約】古いターンの要約（圧縮）          │
├─────────────────────────────────────────┤
│ 直近Nターン（詳細）                       │
│ ユーザーの質問に応じて回答               │
└─────────────────────────────────────────┘

特徴：
- 通常時はシンプル（全送信）
- 閾値超過時のみ要約生成（自動）
- バランスの取れた設計
```

#### Grok（xAI）- 現在の実装

```
【フルコンテキスト】

2Mトークン = 約150万文字
    ↓
ほとんどの会話は全履歴送信可能
    ↓
超過時：古いターンを自動削除（FIFO）

評価：シンプルだが、コスト最適化が不十分 → **改善が必要**
```

---

## 3. 採用設計：閾値ベース Rolling Summary

### 3.1 設計の概要

ChatGPT方式を参考に、**「通常時は全送信、閾値超過時のみ要約」**という設計を採用する。

```
【閾値ベース Rolling Summary】

フェーズ1: 通常時（トークン数 < 閾値）
┌─────────────────────────────────────────┐
│ 全履歴をそのまま送信                     │
│ （Grokの2Mならほぼ常にこれ）             │
└─────────────────────────────────────────┘

フェーズ2: 閾値超過時（トークン数 >= 閾値）
┌─────────────────────────────────────────┐
│ 【要約】古いターンの要約（圧縮）          │
├─────────────────────────────────────────┤
│ 直近Nターン（詳細）                       │
└─────────────────────────────────────────┘
```

### 3.2 設計の理由

| 観点 | 評価 | 説明 |
|------|------|------|
| **実装の簡単さ** | ⭐⭐⭐ | シンプルな分岐処理のみ |
| **バグりにくさ** | ⭐⭐⭐ | 状態管理が単純、テスト容易 |
| **UX** | ⭐⭐⭐ | 通常時は全文脈保持、超過時も要約で保持 |
| **コスト効率** | ⭐⭐⭐ | 閾値超過時のみ要約生成 |

### 3.3 他の設計案との比較

| 設計案 | 簡単さ | 堅牢さ | UX | 採用 |
|--------|--------|--------|-----|------|
| スライディングウィンドウ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ❌ 文脈欠落 |
| **閾値ベース Rolling Summary** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ **採用** |
| 3層メモリ | ⭐ | ⭐ | ⭐⭐⭐ | ❌ 複雑すぎる |
| 常時要約 | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ❌ 無駄な要約が多い |

---

## 4. 実装設計

### 4.1 アーキテクチャ

```
【実装アーキテクチャ】

┌─────────────────────────────────────────┐
│  FeatureChat.tsx                        │
│  - UI表示・メッセージ管理                │
└─────────────────────────────────────────┘
            ↓ messages
┌─────────────────────────────────────────┐
│  useLLMStream.ts                        │
│  - ThresholdRollingSummaryMemory使用    │
│  - 閾値判定・要約生成                    │
└─────────────────────────────────────────┘
            ↓ context（トリミング済み）
┌─────────────────────────────────────────┐
│  streamLLMResponse()                    │
│  - APIクライアント呼び出し               │
└─────────────────────────────────────────┘
            ↓ SSE
┌─────────────────────────────────────────┐
│  /api/llm/stream                        │
│  - GrokClient直接呼び出し                │
│  - xAI Responses API                     │
└─────────────────────────────────────────┘
```

### 4.2 コアクラス設計

```typescript
// lib/llm/memory/threshold-rolling-summary.ts

import type { LLMMessage } from "../types";
import type { GrokClient } from "../clients/grok";

export interface ThresholdRollingSummaryOptions {
  /** 要約開始閾値（トークン数）。デフォルト: 100000（100K） */
  tokenThreshold?: number;
  /** 直近保持するメッセージ数。デフォルト: 10 */
  maxRecentMessages?: number;
}

/**
 * 閾値ベース Rolling Summary Memory
 * 
 * 通常時は全履歴を送信し、閾値超過時のみ要約を生成する。
 * ChatGPT方式を参考にした設計。
 */
export class ThresholdRollingSummaryMemory {
  private tokenThreshold: number;
  private maxRecentMessages: number;
  private summary = "";
  private recentMessages: LLMMessage[] = [];
  private allMessages: LLMMessage[] = [];

  constructor(options: ThresholdRollingSummaryOptions = {}) {
    this.tokenThreshold = options.tokenThreshold ?? 100000;
    this.maxRecentMessages = options.maxRecentMessages ?? 10;
  }

  /**
   * メッセージを追加
   * 閾値超過時は自動的に要約を更新
   */
  async addMessage(
    message: LLMMessage,
    grokClient?: GrokClient
  ): Promise<void> {
    this.allMessages.push(message);
    this.recentMessages.push(message);

    // 閾値チェック（GrokClientが提供されている場合のみ要約）
    if (grokClient && this.shouldSummarize()) {
      await this.updateSummary(grokClient);
      // 要約済みメッセージを削除し、直近のみ保持
      this.recentMessages = this.recentMessages.slice(
        -this.maxRecentMessages
      );
    }
  }

  /**
   * 要約が必要かどうかを判定
   */
  private shouldSummarize(): boolean {
    const estimatedTokens = this.estimateTokens();
    return estimatedTokens > this.tokenThreshold;
  }

  /**
   * トークン数を概算
   * 簡易計算: 1文字 ≈ 0.25トークン
   */
  private estimateTokens(): number {
    const totalChars = this.allMessages.reduce(
      (sum, m) => sum + m.content.length,
      0
    );
    return Math.floor(totalChars * 0.25);
  }

  /**
   * 要約を更新
   */
  private async updateSummary(grokClient: GrokClient): Promise<void> {
    // 要約対象のメッセージ（直近は除く）
    const messagesToSummarize = this.recentMessages.slice(
      0,
      -this.maxRecentMessages
    );

    if (messagesToSummarize.length === 0) return;

    const prompt = this.buildSummaryPrompt(messagesToSummarize);

    try {
      const response = await grokClient.chat([
        { role: "user", content: prompt },
      ]);
      const newSummary = response.content;

      // 要約を累積
      this.summary = this.summary
        ? `${this.summary}\n${newSummary}`
        : newSummary;
    } catch (error) {
      console.error(
        "[ThresholdRollingSummaryMemory] Failed to update summary:",
        error
      );
      // 要約失敗時はそのまま続行（古い要約を保持）
    }
  }

  /**
   * 要約用プロンプトを構築
   */
  private buildSummaryPrompt(messages: LLMMessage[]): string {
    const conversation = messages
      .map((m) => `${m.role}: ${m.content.substring(0, 200)}...`)
      .join("\n");

    const existingSummary = this.summary
      ? `\nこれまでの要約：\n${this.summary}`
      : "";

    return `
以下の会話を200文字以内で要約してください。重要な事実と結論のみを抽出してください。

【会話】
${conversation}${existingSummary}

【新しい要約】（200文字以内）
`.trim();
  }

  /**
   * API送信用のコンテキストを取得
   */
  getContext(): LLMMessage[] {
    if (!this.summary) {
      // 要約がない = 閾値未満 = 全履歴を返す
      return this.allMessages;
    }

    // 要約 + 直近詳細
    return [
      {
        role: "system",
        content: `これまでの会話の要約：\n${this.summary}`,
      },
      ...this.recentMessages,
    ];
  }

  /**
   * DB保存用の全履歴を取得
   */
  getAllMessages(): LLMMessage[] {
    return this.allMessages;
  }

  /**
   * 現在の要約を取得
   */
  getSummary(): string {
    return this.summary;
  }

  /**
   * メモリをクリア
   */
  clear(): void {
    this.summary = "";
    this.recentMessages = [];
    this.allMessages = [];
  }
}
```

### 4.3 useLLMStream統合

```typescript
// hooks/useLLMStream/index.ts

import { ThresholdRollingSummaryMemory } from "@/lib/llm/memory/threshold-rolling-summary";
import { createGrokClient } from "@/lib/llm/clients/grok";

interface UseLLMStreamOptions {
  /** 要約開始閾値（トークン数） */
  tokenThreshold?: number;
  /** 直近保持メッセージ数 */
  maxRecentMessages?: number;
}

export function useLLMStream(options: UseLLMStreamOptions = {}) {
  const { tokenThreshold = 100000, maxRecentMessages = 10 } = options;
  
  // Memoryインスタンスを保持
  const memoryRef = useRef<ThresholdRollingSummaryMemory | null>(null);

  const startStream = useCallback(
    async (messages: LLMMessage[], provider: LLMProvider) => {
      // Memoryを初期化（初回またはリセット後）
      if (!memoryRef.current) {
        memoryRef.current = new ThresholdRollingSummaryMemory({
          tokenThreshold,
          maxRecentMessages,
        });
        
        // 既存メッセージをロード
        const grokClient = createGrokClient(provider);
        for (const msg of messages) {
          await memoryRef.current.addMessage(msg, grokClient);
        }
      }

      // 新規メッセージを追加
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user") {
        const grokClient = createGrokClient(provider);
        await memoryRef.current.addMessage(lastMessage, grokClient);
      }

      // 適切なコンテキストを取得
      const context = memoryRef.current.getContext();

      // API呼び出し（contextを使用）
      for await (const event of streamLLMResponse(
        { messages: context, provider },
        { signal: abortControllerRef.current.signal }
      )) {
        // ...既存のイベント処理...
      }
    },
    [tokenThreshold, maxRecentMessages]
  );

  const resetStream = useCallback(() => {
    // Memoryもクリア
    memoryRef.current?.clear();
    memoryRef.current = null;
    // ...既存のリセット処理...
  }, []);

  return { ... };
}
```

### 4.4 GrokClient連携

```typescript
// lib/llm/clients/grok.ts に追加

export class GrokClient implements LLMClient {
  // ...既存の実装...

  /**
   * 非同期チャット（要約生成用）
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false, // 要約生成は非ストリーミング
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data: XAIResponse = await response.json();
    
    return {
      content: data.output[0]?.content[0]?.text || "",
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        cost: (data.usage.cost_in_usd_ticks || 0) / 10000000,
      },
    };
  }
}
```

---

## 5. 18e0dcda変更による影響と対応

### 5.1 主な変更点

| 変更 | 内容 | 影響 |
|------|------|------|
| **LangChain→xAI直接** | GrokClientを直接使用 | Memory実装もxAI直接呼び出しに統一 |
| **SSE形式変更** | start/tool_call/content/done/error | Memoryは内部処理なので影響なし |
| **thinking削除** | 推論ステップ表示廃止 | Memory実装もシンプルに |
| **toolOptions廃止** | ツール常時有効 | Memory実装でツール設定不要 |

### 5.2 設計書への反映

- ✅ LangChain依存を削除
- ✅ GrokClient直接使用に変更
- ✅ SSEイベント形式を新形式に統一
- ✅ シンプルな設計を維持

---

## 6. 期待される効果

### 6.1 コスト削減

| シナリオ | 現在 | 改善後 | 削減率 |
|---------|------|--------|--------|
| 短い会話（< 閾値） | 全ターン | 全ターン | 0%（維持） |
| 長い会話（> 閾値） | 全ターン | 要約 + 直近 | **70-90%** |

### 6.2 UX改善

| 状況 | 改善前 | 改善後 |
|------|--------|--------|
| 通常時 | 全履歴送信（文脈保持） | 全履歴送信（文脈保持） |
| 長会話時 | 文脈欠落（スライディング） | **要約で文脈保持** |

---

## 7. 実装計画

| フェーズ | 内容 | 工数 | 優先度 |
|---------|------|------|--------|
| **Phase 1** | `ThresholdRollingSummaryMemory`クラス実装 | 2h | 高 |
| **Phase 2** | `GrokClient.chat()`メソッド追加 | 30min | 高 |
| **Phase 3** | `useLLMStream`フックの修正 | 1h | 高 |
| **Phase 4** | テスト・検証 | 2h | 中 |
| **Phase 5** | 閾値調整（本番運用後） | - | 低 |

**合計工数**: 約5.5時間

---

## 8. 設定値の推奨

### 8.1 デフォルト値

| パラメータ | 値 | 理由 |
|-----------|-----|------|
| `tokenThreshold` | 100000（100K） | Grokの2Mの5%、安全マージンあり |
| `maxRecentMessages` | 10 | 十分な直近文脈を保持 |

### 8.2 モデル別の推奨値

| モデル | コンテキスト | tokenThreshold | maxRecentMessages |
|--------|-------------|----------------|-------------------|
| Grok | 2M | 100000 | 10 |
| GPT-4 | 128K | 60000 | 10 |
| Claude | 200K | 80000 | 10 |

---

## 9. 関連ドキュメント

- [llm-integration-overview.md](../../specs/api-integration/llm-integration-overview.md) - LLM統合概要
- `lib/llm/clients/grok.ts` - GrokClient実装
- `hooks/useLLMStream/index.ts` - ストリーミングフック

---

**作成**: 2026-02-24  
**更新**: 2026-02-24  
**ステータス**: 設計確定・実装待ち  
**採用設計**: 閾値ベース Rolling Summary（xAI API直接呼び出し対応）
