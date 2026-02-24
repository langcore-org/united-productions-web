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

現在のAI Hubでは、Grokの2Mトークンという大きなコンテキストウィンドウを活かし、**全履歴を毎回送信**する設計を採用している。

```
【現状の動作】
全履歴（例：100ターン）→ Grok API → 100ターン分の課金
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
- 業界標準のベストプラクティスを採用する
- LangChainを活用した実装に統一する
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

#### Claude（Anthropic）

```
【3層メモリシステム】

┌─────────────────────────────────────┐
│  Layer 1: 短期記憶（コンテキスト）   │
│  - 直近の会話詳細（200Kトークン）   │
├─────────────────────────────────────┤
│  Layer 2: 中期記憶（セッション要約） │
│  - セッション内の重要ポイント        │
├─────────────────────────────────────┤
│  Layer 3: 長期記憶（ユーザーファクト）│
│  - ユーザー固有の知識               │
└─────────────────────────────────────┘

評価：機能は豊富だが、実装が複雑すぎる → **今回は採用しない**
```

#### Grok（xAI）

```
【フルコンテキスト】

2Mトークン = 約150万文字
    ↓
ほとんどの会話は全履歴送信可能
    ↓
超過時：古いターンを自動削除（FIFO）

評価：シンプルだが、コスト最適化が不十分 → **今回は採用しない**
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

### 4.1 クラス設計

```typescript
// lib/llm/langchain/memory/threshold-rolling-summary.ts

import { BaseChatMemory, InputValues, OutputValues } from '@langchain/core/memory';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import type { LLMClient } from '@/lib/llm/types';

export interface ThresholdRollingSummaryInput {
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
export class ThresholdRollingSummaryMemory extends BaseChatMemory {
  private tokenThreshold: number;
  private maxRecentMessages: number;
  private summary = '';
  private recentMessages: BaseMessage[] = [];
  private allMessages: BaseMessage[] = [];

  constructor(fields?: ThresholdRollingSummaryInput) {
    super();
    this.tokenThreshold = fields?.tokenThreshold ?? 100000;
    this.maxRecentMessages = fields?.maxRecentMessages ?? 10;
  }

  /**
   * メモリ変数を読み込み
   * 通常時: 全履歴
   * 閾値超過時: 要約 + 直近詳細
   */
  async loadMemoryVariables(): Promise<{ history: BaseMessage[] }> {
    if (!this.summary) {
      // 要約がない = 閾値未満 = 全履歴を返す
      return { history: this.allMessages };
    }

    // 要約 + 直近詳細
    const summaryMessage = new SystemMessage(
      `これまでの会話の要約：\n${this.summary}`
    );
    return { history: [summaryMessage, ...this.recentMessages] };
  }

  /**
   * コンテキストを保存
   * 閾値超過時は自動的に要約を更新
   */
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues,
    llm?: LLMClient
  ): Promise<void> {
    const input = this.getInputString(inputValues);
    const output = this.getOutputString(outputValues);

    // メッセージを追加
    const humanMsg = new HumanMessage(input);
    const aiMsg = new AIMessage(output);
    
    this.allMessages.push(humanMsg, aiMsg);
    this.recentMessages.push(humanMsg, aiMsg);

    // 閾値チェック（LLMが提供されている場合のみ要約）
    if (llm && this.shouldSummarize()) {
      await this.updateSummary(llm);
      // 要約済みメッセージを削除し、直近のみ保持
      this.recentMessages = this.recentMessages.slice(-this.maxRecentMessages * 2);
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
      (sum, m) => sum + (m.content?.toString().length ?? 0),
      0
    );
    return Math.floor(totalChars * 0.25);
  }

  /**
   * 要約を更新
   */
  private async updateSummary(llm: LLMClient): Promise<void> {
    // 要約対象のメッセージ（直近は除く）
    const messagesToSummarize = this.recentMessages.slice(
      0,
      -this.maxRecentMessages * 2
    );

    if (messagesToSummarize.length === 0) return;

    const prompt = this.buildSummaryPrompt(messagesToSummarize);
    
    try {
      const response = await llm.chat([{ role: 'user', content: prompt }]);
      const newSummary = response.content;

      // 要約を累積
      this.summary = this.summary
        ? `${this.summary}\n${newSummary}`
        : newSummary;
    } catch (error) {
      console.error('[ThresholdRollingSummaryMemory] Failed to update summary:', error);
      // 要約失敗時はそのまま続行（古い要約を保持）
    }
  }

  /**
   * 要約用プロンプトを構築
   */
  private buildSummaryPrompt(messages: BaseMessage[]): string {
    const conversation = messages
      .map(m => `${m._getType()}: ${m.content?.toString().substring(0, 200)}...`)
      .join('\n');

    const existingSummary = this.summary
      ? `\nこれまでの要約：\n${this.summary}`
      : '';

    return `
以下の会話を200文字以内で要約してください。重要な事実と結論のみを抽出してください。

【会話】
${conversation}
${existingSummary}

【新しい要約】（200文字以内）
`.trim();
  }

  /**
   * 入力値を文字列に変換
   */
  private getInputString(values: InputValues): string {
    const input = values.input ?? values.question ?? values.human_input;
    return typeof input === 'string' ? input : JSON.stringify(input);
  }

  /**
   * 出力値を文字列に変換
   */
  private getOutputString(values: OutputValues): string {
    const output = values.output ?? values.response ?? values.answer;
    return typeof output === 'string' ? output : JSON.stringify(output);
  }

  /**
   * メモリをクリア
   */
  async clear(): Promise<void> {
    this.summary = '';
    this.recentMessages = [];
    this.allMessages = [];
  }

  /**
   * DB保存用の全履歴を取得
   */
  getAllMessages(): BaseMessage[] {
    return this.allMessages;
  }

  /**
   * 現在の要約を取得
   */
  getSummary(): string {
    return this.summary;
  }
}
```

### 4.2 統合設計

```typescript
// lib/llm/langchain/chains/streaming.ts

import { ThresholdRollingSummaryMemory } from '../memory/threshold-rolling-summary';

export async function* executeStreamingChat(
  model: BaseChatModel,
  messages: LLMMessage[],
  options?: {
    k?: number;
    tokenThreshold?: number;
    maxRecentMessages?: number;
  }
): AsyncIterable<StreamingYield> {
  
  // Memoryを初期化
  const memory = new ThresholdRollingSummaryMemory({
    tokenThreshold: options?.tokenThreshold ?? 100000,
    maxRecentMessages: options?.maxRecentMessages ?? 10
  });

  // 既存メッセージをロード
  for (let i = 0; i < messages.length - 1; i += 2) {
    await memory.saveContext(
      { input: messages[i].content },
      { output: messages[i + 1]?.content || '' }
    );
  }

  // 適切なコンテキストを取得
  const { history } = await memory.loadMemoryVariables();

  // ストリーミング実行
  const stream = await model.stream(history, {
    callbacks: [callbackHandler],
  });

  // ...残りの実装
}
```

### 4.3 フック設計

```typescript
// hooks/useLLMStream/index.ts

interface UseLLMStreamOptions {
  /** 要約開始閾値（トークン数） */
  tokenThreshold?: number;
  /** 直近保持メッセージ数 */
  maxRecentMessages?: number;
}

export function useLLMStream(options: UseLLMStreamOptions = {}) {
  const { tokenThreshold = 100000, maxRecentMessages = 10 } = options;

  const startStream = useCallback(async (
    messages: LLMMessage[],
    provider: LLMProvider,
    toolOptions?: ToolOptions
  ) => {
    // ...既存の初期化処理...

    for await (const event of streamLLMResponse(
      { 
        messages, 
        provider, 
        toolOptions,
        tokenThreshold,
        maxRecentMessages
      },
      { signal: abortControllerRef.current.signal },
    )) {
      // ...既存のイベント処理...
    }
  }, [tokenThreshold, maxRecentMessages]);

  return { ... };
}
```

---

## 5. 期待される効果

### 5.1 コスト削減

| シナリオ | 現在 | 改善後 | 削減率 |
|---------|------|--------|--------|
| 短い会話（< 閾値） | 全ターン | 全ターン | 0%（維持） |
| 長い会話（> 閾値） | 全ターン | 要約 + 直近 | **70-90%** |

### 5.2 UX改善

| 状況 | 改善前 | 改善後 |
|------|--------|--------|
| 通常時 | 全履歴送信（文脈保持） | 全履歴送信（文脈保持） |
| 長会話時 | 文脈欠落（スライディング） | **要約で文脈保持** |

### 5.3 バグリスク

| リスク | 対策 |
|--------|------|
| 要約生成失敗 | try-catchでエラーハンドリング、失敗時は古い要約を保持 |
| トークン計算の誤差 | 概算なので、閾値に余裕を持たせる（100Kでなく80K等） |
| 要約の品質 | プロンプトを調整可能、必要に応じて手動要約も検討 |

---

## 6. 実装計画

| フェーズ | 内容 | 工数 | 優先度 |
|---------|------|------|--------|
| **Phase 1** | `ThresholdRollingSummaryMemory`クラス実装 | 2h | 高 |
| **Phase 2** | `chains/streaming.ts`への統合 | 1h | 高 |
| **Phase 3** | `useLLMStream`フックの修正 | 1h | 高 |
| **Phase 4** | API Routeの修正 | 30min | 中 |
| **Phase 5** | テスト・検証 | 2h | 中 |
| **Phase 6** | 閾値調整（本番運用後） | - | 低 |

**合計工数**: 約6.5時間

---

## 7. 設定値の推奨

### 7.1 デフォルト値

| パラメータ | 値 | 理由 |
|-----------|-----|------|
| `tokenThreshold` | 100000（100K） | Grokの2Mの5%、安全マージンあり |
| `maxRecentMessages` | 10 | 十分な直近文脈を保持 |

### 7.2 モデル別の推奨値

| モデル | コンテキスト | tokenThreshold | maxRecentMessages |
|--------|-------------|----------------|-------------------|
| Grok | 2M | 100000 | 10 |
| GPT-4 | 128K | 60000 | 10 |
| Claude | 200K | 80000 | 10 |

---

## 8. 関連ドキュメント

- [llm-integration-overview.md](./llm-integration-overview.md) - LLM統合概要
- [streaming-events.md](./streaming-events.md) - ストリーミングイベント仕様
- `lib/llm/langchain/` - LangChain実装

---

**作成**: 2026-02-24  
**更新**: 2026-02-24  
**ステータス**: 設計確定・実装待ち  
**採用設計**: 閾値ベース Rolling Summary
