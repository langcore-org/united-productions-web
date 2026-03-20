# LangChain 将来検討事項（Backlog）

> **langchain-usage-current.md から抽出した将来検討事項**
>
> **最終更新**: 2026-03-20
> **抽出日**: 2026-02-24

---

## 概要

このドキュメントは `docs/specs/api-integration/langchain-usage-current.md` に記載されていた将来検討事項をBacklogとして管理するものです。

---

## 検討事項一覧

| 機能 | 優先度 | 検討内容 | 現状の代替手段 |
|-----|--------|---------|--------------|
| **@langchain/textsplitters** | 低 | 必要に応じて導入 | 現状は不要（Grokの2Mコンテキストで十分） |
| **VectorStore** | 低 | Pinecone/Supabase等 | Grokの長いコンテキスト + collections_searchツール |
| **createReactAgent** | 低 | 本格的なReActパターン | Grokのネイティブツール機能 |
| **BufferMemory** | 低 | Redis永続化が必要になった場合 | Prisma + データベース永続化 |

---

## 各機能の詳細

### 1. @langchain/textsplitters

**用途**: 長文ドキュメントの分割

**導入検討タイミング**:
- RAG機能を再実装する場合
- 長文ドキュメントを扱う必要が出た場合
- コンテキストウィンドウを超える入力が必要になった場合

**現状の代替**:
- Grokの2Mトークンコンテキストでほとんどのケースをカバー

---

### 2. VectorStore

**用途**: ベクトル検索、セマンティック検索

**導入検討タイミング**:
- 大量のドキュメントからの検索が必要になった場合
- セマンティック検索（意味ベースの検索）が必要になった場合
- Grokのcollections_searchでは不足する場合

**候補サービス**:
- Pinecone
- Supabase Vector
- Weaviate
- Qdrant

**現状の代替**:
- Grokの2Mコンテキスト
- Grokのcollections_searchツール

---

### 3. createReactAgent

**用途**: 本格的なReAct（Reasoning + Acting）パターンの実装

**導入検討タイミング**:
- 複数ステップの推論が必要な複雑なタスクが増えた場合
- ツールの選択と実行をより細かく制御したい場合
- Grokのネイティブツール機能では不足する場合

**現状の代替**:
- Grokのネイティブツール機能（web_search, x_search等）
- シンプルなツール呼び出しチェーン

---

### 4. BufferMemory

**用途**: 会話履歴の管理（Redis永続化）

**導入検討タイミング**:
- セッション跨いでの会話履歴永続化が必要になった場合
- 複数サーバー構成でメモリを共有したい場合
- データベースアクセスを減らしたい場合

**候補実装**:
```typescript
import { BufferMemory } from 'langchain/memory';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';

const memory = new BufferMemory({
  chatHistory: new UpstashRedisChatMessageHistory({
    sessionId,
    config: { 
      url: process.env.UPSTASH_REDIS_REST_URL, 
      token: process.env.UPSTASH_REDIS_REST_TOKEN 
    }
  })
});
```

**現状の代替**:
- Prisma + データベース永続化
- 全履歴を毎回送信（Grokの2Mコンテキストで問題なし）

---

## 優先度の基準

| 優先度 | 基準 |
|-------|------|
| **高** | 現在の実装で不足が明確で、近い将来（1-3ヶ月）に対応が必要 |
| **中** | 将来的に必要になる可能性があり、半年以内に検討 |
| **低** | 現状の代替手段で十分で、明確な需要が出るまでは対応不要 |

---

## 関連ドキュメント

- [llm-integration-overview.md](../../specs/api-integration/llm-integration-overview.md) - LLM統合概要
- [streaming-events.md](../../specs/api-integration/streaming-events.md) - ストリーミングイベント仕様
- `lib/llm/langchain/` - LangChain実装

---

**備考**: このBacklogは必要に応じて更新してください。優先度が「高」に変更された場合は、別途計画書を作成してください。

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
