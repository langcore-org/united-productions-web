# 会話記憶（Memory）設計検討書

> **AI Hubプロジェクトにおける会話履歴管理の設計検討**
>
> **作成日**: 2026-02-24
> **ステータス**: 検討完了・実装待ち

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

### 1.3 目的

- コストを削減しつつ、必要な文脈は保持する
- 業界標準のベストプラクティスを採用する
- LangChainを活用した実装に統一する

---

## 2. 各社の設計比較

### 2.1 概要

| 項目 | ChatGPT (OpenAI) | Claude (Anthropic) | Grok (xAI) | Gemini (Google) |
|------|------------------|-------------------|------------|-----------------|
| **コンテキスト** | 128K | 200K | **2M** | 1M |
| **記憶戦略** | スライディング + 要約 | **3層メモリ** | フル送信 | キャッシング |
| **永続化** | サーバー | クライアント | サーバー | サーバー |
| **強み** | バランス型 | 精密制御 | シンプル | 長文処理 |

### 2.2 詳細な設計

#### ChatGPT（OpenAI）

```
【スライディングウィンドウ + 要約圧縮】

全履歴保存（DB）
    ↓
スライディングウィンドウ（直近Nターン）
    ↓
要約圧縮（古いターンは要約に置き換え）
    ↓
API送信（128K以内に収める）

特徴：
- 古い会話は自動的に要約・圧縮
- 「Memory」機能で会話跨ぎの記憶も可能
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
│  - 自動/手動で要約生成              │
├─────────────────────────────────────┤
│  Layer 3: 長期記憶（ユーザーファクト）│
│  - ユーザー固有の知識               │
│  - 「好きな言語はTypeScript」等     │
│  - 明示的に保存/更新                │
└─────────────────────────────────────┘

特徴：
- 明示的なMemory Toolを提供
- 3層の階層的な記憶管理
- 最も精密な制御が可能
```

#### Grok（xAI）

```
【フルコンテキスト + メモリ機能】

2Mトークン = 約150万文字
    ↓
ほとんどの会話は全履歴送信可能
    ↓
超過時：古いターンを自動削除（FIFO）
    ↓
「Memory」機能で重要情報を永続保存

特徴：
- 2Mトークンは実質的に「無制限」に近い
- 長文ドキュメントもそのまま送信可能
- シンプルな設計
```

#### Gemini（Google）

```
【ロングコンテキスト + キャッシング】

1Mトークン（長文ドキュメント数冊分）
    ↓
コンテキストキャッシング
    ↓
頻繁に使うコンテキストを再利用
    ↓
課金を抑えつつ長文を処理

特徴：
- 1Mトークンで長文書籍も処理可能
- コンテキストキャッシングでコスト削減
- 複数ターンで同じ長文を参照する場合に効果的
```

---

## 3. 一般的な開発者・OSSの設計パターン

### 3.1 調査結果

| パターン | 採用率 | 実装難易度 | 用途 |
|---------|--------|-----------|------|
| **スライディングウィンドウ** | 最も多い | ⭐ 簡単 | 標準的なチャット |
| **トークンベーストリミング** | 多い | ⭐⭐ 普通 | コスト重視 |
| **Redis + セッション** | 中程度 | ⭐⭐⭐ 普通 | 本格アプリ |
| **要約圧縮** | 少ない | ⭐⭐⭐⭐ 難しい | 長期コンテキスト |

### 3.2 OSSプロジェクトの実態

| プロジェクト | 設計 | 規模 |
|------------|------|------|
| **Vercel AI SDK** | スライディングウィンドウ + カスタムフック | 大規模 |
| **LangChain Memory** | BufferMemory, VectorStore等複数提供 | エンタープライズ |
| **Mem0** | インテリジェントメモリ層 | スタートアップ向け |
| **一般的なNext.jsアプリ** | スライディングウィンドウ + DB保存 | 小〜中規模 |

---

## 4. 検討した設計案

### 4.1 案1: スマートトリミング（簡易版）

```typescript
// lib/llm/utils/message-trimmer.ts
export function trimMessages(
  messages: LLMMessage[],
  options: { maxMessages?: number; keepSystemMessage?: boolean } = {}
): LLMMessage[] {
  const { maxMessages = 20, keepSystemMessage = true } = options;
  
  const systemMessages = keepSystemMessage
    ? messages.filter(m => m.role === 'system')
    : [];
  
  const chatMessages = messages.filter(m => m.role !== 'system');
  const recentChat = chatMessages.slice(-maxMessages);
  
  return [...systemMessages, ...recentChat];
}
```

**評価**:
- ✅ 実装が最も簡単
- ✅ コスト削減効果大
- ⚠️ LangChainと統一感がない

### 4.2 案2: 3層メモリ（Claude方式）

```typescript
interface ThreeLayerMemory {
  recentMessages: LLMMessage[];      // Layer 1: 短期
  sessionSummary?: string;            // Layer 2: 中期
  userFacts: string[];                // Layer 3: 長期
}
```

**評価**:
- ✅ 最も高度な機能
- ✅ パーソナライゼーション可能
- ❌ 実装が複雑
- ❌ 現在の要件では過剰

### 4.3 案3: LangChain ConversationBufferWindowMemory（推奨）

```typescript
// lib/llm/langchain/memory/buffer-window-memory.ts
import { BaseChatMemory } from '@langchain/core/memory';

export class ConversationBufferWindowMemory extends BaseChatMemory {
  k: number;  // 保持するターン数
  
  async loadMemoryVariables() {
    return { history: this.chatHistory.slice(-this.k * 2) };
  }
  
  async saveContext(inputValues, outputValues) {
    // 保存時に自動的にトリミング
    this.trimHistory();
  }
}
```

**評価**:
- ✅ LangChain標準で堅牢
- ✅ 実装が比較的簡単
- ✅ 既存コードとの統一感
- ✅ 将来の拡張性

---

## 5. 推奨設計

### 5.1 採用案: LangChain ConversationBufferWindowMemory

**理由**:
1. **LangChain統一**: 既にLangChainを導入しているため
2. **実装の簡単さ**: 標準機能を利用
3. **業界標準**: 一般的な設計パターン
4. **拡張性**: 後でRedis等に置き換え可能

### 5.2 設計詳細

```
【推奨設計：ConversationBufferWindowMemory】

┌─────────────────────────────────────────┐
│  データベース（Prisma）                  │
│  - 全履歴を永続保存（表示用）            │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  ConversationBufferWindowMemory         │
│  - 直近Kターン（デフォルト10）のみ保持   │
│  - システムメッセージは常時保持          │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  Grok API                               │
│  - トリミング済みメッセージのみ送信      │
│  - コスト削減                           │
└─────────────────────────────────────────┘
```

### 5.3 実装計画

| フェーズ | 内容 | 優先度 |
|---------|------|--------|
| **Phase 1** | `ConversationBufferWindowMemory`実装 | 高 |
| **Phase 2** | `chains/streaming.ts`への統合 | 高 |
| **Phase 3** | `useLLMStream`フックの修正 | 高 |
| **Phase 4** | API Routeの修正 | 中 |
| **Phase 5** | テスト・検証 | 中 |

---

## 6. 実装コード（参考）

### 6.1 Memoryクラス

```typescript
// lib/llm/langchain/memory/buffer-window-memory.ts
import { BaseChatMemory, InputValues, OutputValues } from '@langchain/core/memory';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

export interface BufferWindowMemoryInput {
  k?: number;  // 保持するターン数（デフォルト: 5）
  returnMessages?: boolean;
}

export class ConversationBufferWindowMemory extends BaseChatMemory {
  k: number;
  private chatHistory: BaseMessage[] = [];

  constructor(fields?: BufferWindowMemoryInput) {
    super();
    this.k = fields?.k ?? 5;
  }

  // 履歴を取得（直近Kターンのみ）
  async loadMemoryVariables(): Promise<{ history: BaseMessage[] }> {
    return { history: this.chatHistory.slice(-this.k * 2) };
  }

  // メッセージを保存
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues
  ): Promise<void> {
    const input = this.getInputString(inputValues);
    const output = this.getOutputString(outputValues);
    
    this.chatHistory.push(new HumanMessage(input));
    this.chatHistory.push(new AIMessage(output));
    
    this.trimHistory();
  }

  private trimHistory() {
    const keepCount = this.k * 2;  // user + assistant = 1ターン
    if (this.chatHistory.length > keepCount) {
      this.chatHistory = this.chatHistory.slice(-keepCount);
    }
  }

  async clear(): Promise<void> {
    this.chatHistory = [];
  }
}
```

### 6.2 統合例

```typescript
// lib/llm/langchain/chains/streaming.ts
import { ConversationBufferWindowMemory } from '../memory/buffer-window-memory';

export async function* executeStreamingChat(
  model: BaseChatModel,
  messages: LLMMessage[],
  options?: { k?: number }
): AsyncIterable<StreamingYield> {
  
  const memory = new ConversationBufferWindowMemory({ 
    k: options?.k ?? 10
  });
  
  // 既存メッセージをロード
  for (let i = 0; i < messages.length - 1; i += 2) {
    await memory.saveContext(
      { input: messages[i].content },
      { output: messages[i + 1]?.content || '' }
    );
  }
  
  const { history } = await memory.loadMemoryVariables();
  
  // 以降はhistoryを使用
  const stream = await model.stream(history, {
    callbacks: [callbackHandler],
  });
  
  // ...
}
```

---

## 7. 期待される効果

### 7.1 コスト削減

| シナリオ | 現在 | 改善後 | 削減率 |
|---------|------|--------|--------|
| 100ターンの会話 | 100ターン分 | 10ターン分 | **90%** |
| 50ターンの会話 | 50ターン分 | 10ターン分 | **80%** |
| 20ターンの会話 | 20ターン分 | 10ターン分 | **50%** |

### 7.2 レイテンシ改善

- 送信トークン数が減少 → API応答時間短縮
- 推定: 30-50%の改善

### 7.3 将来の移行容易性

- 他のモデル（128K等）への移行が容易
- LangChain標準なので、モデル変更時も修正が最小限

---

## 8. リスクと対策

| リスク | 内容 | 対策 |
|--------|------|------|
| **文脈欠落** | 古い情報が必要な場合 | デフォルト10ターンは十分な経験値 |
| **実装バグ** | メッセージの整合性が崩れる | 十分なテスト実施 |
| **ユーザー体験** | 文脈を忘れたように見える | UIで「直近Nターン表示中」等の表示 |

---

## 9. 結論

### 推奨事項

**LangChain `ConversationBufferWindowMemory` を採用し、直近10ターン（デフォルト）を送信する設計とする。**

### 理由

1. **LangChain統一**: 既存の技術スタックと統一感がある
2. **実装の簡単さ**: 標準機能を活用し、実装工数を最小化
3. **コスト効果**: 90%のコスト削減が見込める
4. **将来性**: 他のモデルへの移行も容易

### 次のアクション

1. `ConversationBufferWindowMemory` クラスの実装
2. `chains/streaming.ts` への統合
3. `useLLMStream` フックの修正
4. テスト・検証

---

## 関連ドキュメント

- [llm-integration-overview.md](./llm-integration-overview.md) - LLM統合概要
- [streaming-events.md](./streaming-events.md) - ストリーミングイベント仕様
- `lib/llm/langchain/` - LangChain実装

---

**作成**: 2026-02-24  
**更新**: 2026-02-24  
**ステータス**: 検討完了・実装待ち
