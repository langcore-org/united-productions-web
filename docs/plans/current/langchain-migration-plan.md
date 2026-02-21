# LangChain 導入計画書

> **Next.jsプロジェクトへのLangChain段階的導入計画**
>
> **作成日**: 2026-02-21 19:30
> **更新日**: 2026-02-21 19:30
> **調査基準日**: 2026-02-21（LangChain JS v0.3.x）

---

## 1. 計画概要

### 1.1 目的

現在の独自実装（`lib/llm/`）における以下の課題を解決する：

- 複雑なエージェントワークフローの実装（自律的タスク実行）
- 高度なツール連携（複数ツールの連鎖、条件分岐）
- 文書検索・RAG（Retrieval-Augmented Generation）の標準化
- 会話履歴管理・メモリの永続化
- 複雑なプロンプトテンプレート管理

### 1.2 方針

**LangChainを段階的に導入し、シンプルなチャット機能にはVercel AI SDK併用を検討する。**

---

## 2. 移行のメリット・デメリット・注意点

### 2.1 メリット

#### 短期的メリット（導入直後）

| 項目 | 詳細 | 期待効果 |
|------|------|---------|
| エージェント機能 | 複雑なワークフロー（ReAct、Plan-and-Execute等）が標準で利用可能 | 自律的タスク実行機能の開発工数を約60-70%削減 |
| RAG統合 | Document Loader、Vector Store、Retrieval Chainが標準化 | 文書検索機能の実装工数を約50%削減 |
| ツール生態系 | 200+の統合ツール（検索、DB、API等）が即座に使用可能 | 外部サービス連携の実装工数を大幅削減 |
| プロンプト管理 | PromptTemplate、FewShotPromptTemplate等の標準化 | プロンプトの管理・再利用性向上 |

#### 中長期的メリット（導入後3-6ヶ月）

| 項目 | 詳細 | 期待効果 |
|------|------|---------|
| マルチモーダル対応 | 画像、音声、動画の入出力が標準化 | マルチモーダル機能の追加が容易に |
| 観測性 | LangSmithによる実行トレース、コスト分析 | 運用監視・最適化が容易に |
| コミュニティ | 豊富なサンプル・ドキュメント・統合 | 問題解決のための情報収集が容易に |
| フレームワーク独立性 | 複数のLLMプロバイダーに対応した抽象化 | プロバイダー切り替えの柔軟性向上 |

### 2.2 デメリット

#### 技術的デメリット

| 項目 | 詳細 | 影響範囲 |
|------|------|---------|
| 学習曲線の急峻さ | 抽象化レイヤーが多く、概念（Chain、Agent、Memory等）の習得に時間がかかる | チーム全員の学習期間（数日〜数週間） |
| パッケージサイズ | フルインストール時に bundle size が大きくなる | クライアントサイドでの使用時に注意が必要 |
| 抽象化のオーバーヘッド | 標準化レイヤーによるわずかなパフォーマンス低下 | レイテンシが数10ms増加する可能性 |
| バージョン移行 | v0.1→v0.2→v0.3と破壊的変更が頻繁 | アップデート時の対応工数が必要 |

#### 運用・管理デメリット

| 項目 | 詳細 | 対応策 |
|------|------|--------|
| ドキュメントの分散 | 公式ドキュメントが複数サイトに分散（Python/JS、v0.1/v0.2/v0.3） | 使用バージョンのドキュメントを明確化 |
| 移行期間中の複雑化 | 新旧コードの混在による可読性低下 | 明確な移行スケジュール設定、迅速な移行完了 |
| 依存関係の増加 | 多くのパッケージに依存 | 必要な機能のみインポート（tree-shaking） |

### 2.3 注意点

#### 技術的注意点

1. **Streaming対応の複雑さ**
   - LangChainのストリーミングはプロバイダー・モデルによって挙動が異なる
   - Vercel AI SDKと比較して設定が複雑な場合がある

2. **ツール呼び出しの実装差異**
   - Tool/Function Callingの実装がプロバイダーによって異なる
   - Structured Output（JSONモード）の扱いに注意が必要

3. **メモリ管理**
   - 会話履歴の永続化方法（BufferMemory、BufferWindowMemory等）を適切に選択
   - 長時間会話でのトークン数増大に対する対策が必要

4. **エラーハンドリング**
   - LLMの出力パースエラー（OutputParserException）への対応
   - フォールバック（Fallback）戦略の設計

#### 運用上の注意点

1. **段階的移行の徹底**
   - 一度に全てを移行せず、小さな機能から順に移行
   - 各Phaseで動作確認とロールバック計画を準備

2. **ドキュメントの更新**
   - 移行に伴い、技術仕様書・開発者ガイドを即座に更新
   - 新旧の実装パターンを比較できる資料を残す

3. **チーム内の合意形成**
   - 移行前にチーム全員で計画をレビュー
   - 学習時間の確保、ペアプログラミングの実施

4. **外部依存の管理**
   - LangChain関連パッケージのバージョンアップデート方針を決定
   - セキュリティアップデートの監視体制

### 2.4 現状の該当性分析

#### カスタム機能の有無（該当するか？）

| カスタム機能 | 現状 | LangChain対応 | 該当性 |
|------------|------|--------------|--------|
| SSEフォーマット | 標準的な`data: {...}`形式 | ⚠️ 標準化されているが実装が複雑 | 軽微 |
| 独自イベント型 | `content`, `thinking`, `toolCall`, `reasoning`, `toolUsage` | ✅ Chainの出力でカスタマイズ可能 | 該当しない |
| `reasoningSteps`パース | `parseSubSteps`で独自パース | ✅ OutputParserで実装可能 | 該当しない |
| ツール状態管理 | `pending`→`running`→`completed` | ✅ AgentExecutorで自動管理 | 該当しない |
| usage手動記録 | `trackUsage`関数で手動 | ⚠️ Callbacksで実装可能 | 軽微 |

**結論**: 低程度に該当する。ほとんどのカスタム機能はLangChainの標準機能で置き換え可能。

#### 移行を進めるべき状況
- ✅ 複雑なエージェントワークフロー（自律的タスク実行）が必要
- ✅ RAG（文書検索）機能の追加を検討中
- ✅ 複数の外部ツール/APIとの連携が必要
- ✅ 会話履歴の高度な管理（要約、ベクトル検索等）が必要
- ✅ チームにPython/JavaScriptの知見が豊富

#### 移行を見送るべき状況
- ❌ シンプルなチャット機能のみで十分
- ❌ 学習コストをかけられない
- ❌ bundle size の増加が許容できない
- ❌ プロジェクトの終了・手入れフェーズ

---

## 3. 安全な移行戦略

### 3.1 基本方針

```
┌─────────────────────────────────────────────────────────────┐
│                    安全な移行の原則                          │
├─────────────────────────────────────────────────────────────┤
│ 1. 並行運用: 新旧コードを並行して運用し、段階的に切り替え     │
│ 2. ロールバック: 各段階で即座に元に戻せる体制を確保          │
│ 3. 検証優先: 本番適用前に十分な検証を実施                    │
│ 4. 影響最小化: 既存機能への影響を最小限に抑える              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 ロールバック計画

#### Phase 1（パイロット）のロールバック

```typescript
// 機能フラグによる切り替え
const USE_LANGCHAIN = process.env.USE_LANGCHAIN === 'true';

// API Routeでの切り替え
export async function POST(req: Request) {
  if (USE_LANGCHAIN) {
    return handleWithLangChain(req);  // 新実装
  }
  return handleWithLegacy(req);       // 既存実装
}
```

**ロールバック手順（5分以内）:**
1. Vercel Dashboardで環境変数 `USE_LANGCHAIN=false` を設定
2. 再デプロイ（キャッシュクリア）
3. 動作確認

#### Phase 2+（本格移行）のロールバック

```bash
# Gitベースのロールバック
git revert HEAD  # 直前のコミットを元に戻す
git push origin main

# または特定のコミットに戻す
git reset --hard <stable-commit-hash>
git push origin main --force
```

### 3.3 段階的リリース戦略

#### カナリアリリース

```
┌────────────────────────────────────────────────────────────┐
│  カナリアリリースフロー                                      │
├────────────────────────────────────────────────────────────┤
│  Step 1: 開発環境で完全検証                                  │
│     ↓                                                      │
│  Step 2: ステージング環境でE2Eテスト                        │
│     ↓                                                      │
│  Step 3: 本番環境で1ユーザーのみ有効化（内部テスト）         │
│     ↓                                                      │
│  Step 4: 本番環境で10%のユーザーに有効化                    │
│     ↓                                                      │
│  Step 5: 全ユーザーにロールアウト                           │
└────────────────────────────────────────────────────────────┘
```

#### 環境変数による制御

```bash
# .env.local（開発環境）
USE_LANGCHAIN=true
LANGCHAIN_ROLLOUT_PERCENTAGE=100

# .env.production（本番環境）
USE_LANGCHAIN=true
LANGCHAIN_ROLLOUT_PERCENTAGE=10  # 段階的に増加: 10 → 50 → 100
```

### 3.4 影響範囲の制御

#### 変更対象ファイルの分離

```
lib/
├── llm/
│   ├── legacy/          # 既存実装（移行完了まで保持）
│   │   ├── clients/
│   │   ├── factory.ts
│   │   └── types.ts
│   └── langchain/       # 新実装
│       ├── chains/      # Chain定義
│       ├── agents/      # Agent定義
│       ├── tools/       # Tool定義
│       ├── memory/      # Memory設定
│       └── config.ts    # LangChain設定
```

#### 互換性レイヤーの設計

```typescript
// lib/llm/adapter.ts
// 新旧実装の互換性を保つアダプター

import { type Message as LegacyMessage } from './legacy/types';
import { type BaseMessage } from '@langchain/core/messages';

export function toLangChainMessages(
  legacyMessages: LegacyMessage[]
): BaseMessage[] {
  return legacyMessages.map(m => {
    if (m.role === 'user') {
      return new HumanMessage(m.content);
    }
    return new AIMessage(m.content);
  });
}

export function fromLangChainMessages(
  langChainMessages: BaseMessage[]
): LegacyMessage[] {
  // 逆変換
}
```

---

## 4. 現状の実装分析

### 4.1 バックエンド層

#### API Routes層
- **ファイル**: `app/api/llm/stream/route.ts`
- **役割**: SSE形式のストリーミングレスポンス生成
- **現状の複雑さ**:
  - `ReadableStream`の手動構築
  - SSEフォーマット（`data: {...}\n\n`）の手動生成
  - エラーハンドリングの分散（各イベントタイプごとに個別処理）
  - usage情報の集計とDB保存の手動実装

#### LLMクライアント層
- **ファイル**: `lib/llm/clients/grok.ts`
- **役割**: xAI APIとの通信、ストリーミングパース
- **現状の複雑さ**:
  - xAI Responses APIの独自パース処理
  - ツール呼び出し状態管理（`pending`→`running`→`completed`）
  - 思考プロセス（`reasoning`）の抽出と整形
  - 複数イベントタイプの個別ハンドリング

#### Factoryパターン
- **ファイル**: `lib/llm/factory.ts`
- **役割**: プロバイダー別クライアント生成
- **現状**: プロバイダー追加時にswitch文の拡張が必要

### 4.2 フロントエンド層

#### ストリーミングフック
- **ファイル**: `components/ui/StreamingMessage.tsx`
- **役割**: SSEストリームの消費と状態管理
- **現状の複雑さ**:
  - `parseSSEStream`による手動パース
  - 複数状態の個別管理
  - AbortControllerによる手動キャンセル処理
  - エラーハンドリングの自前実装

#### チャットUI
- **ファイル**: `components/ui/FeatureChat.tsx`
- **役割**: チャットインターフェース全体
- **現状の複雑さ**:
  - スクロール制御の自前実装
  - メッセージ配列の手動更新
  - ツール呼び出し・思考ステップの個別表示ロジック
  - ローディング状態の手動管理

### 4.3 型定義層
- **ファイル**: `lib/llm/types.ts`
- **現状**: 独自の`LLMClient`インターフェース、`LLMMessage`型等を定義

---

## 5. LangChain 概要

### 5.1 バージョン情報

| バージョン | ステータス | 主な特徴 |
|-----------|-----------|---------|
| v0.3.x | 安定版（推奨） | モジュール化、tree-shaking改善、LCEL（LangChain Expression Language） |
| v0.2.x | 保守フェーズ | 旧モジュール構成 |
| v0.1.x | 非推奨 | 初期バージョン |

### 5.2 構成要素

#### LangChain Core
- **用途**: メッセージ、出力パーサー、コールバック等の基本型
- **主要クラス**:
  - `BaseMessage`: メッセージの基底クラス（HumanMessage, AIMessage, SystemMessage等）
  - `BaseOutputParser`: 出力パーサーの基底クラス
  - `Runnable`: LCELの基本インターフェース

#### LangChain Community
- **用途**: サードパーティ統合（LLM、Vector Store、Document Loader等）
- **主要クラス**:
  - `ChatOpenAI`, `ChatAnthropic`, `ChatXAI`等のモデル
  - `HuggingFaceInference`, `Ollama`等のローカルモデル

#### LangChain
- **用途**: 高レベル抽象化（Chain、Agent、Memory等）
- **主要クラス**:
  - `LLMChain`: プロンプト+モデルの基本Chain
  - `AgentExecutor`: Agentの実行エンジン
  - `ConversationalRetrievalQAChain`: RAG用Chain

### 5.3 LCEL（LangChain Expression Language）

```typescript
// LCELによるChainの構成
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

const model = new ChatOpenAI({ model: 'gpt-4' });
const prompt = PromptTemplate.fromTemplate('Tell me a joke about {topic}');

// LCELでのChain構築
const chain = RunnableSequence.from([
  prompt,
  model,
]);

const result = await chain.invoke({ topic: 'cats' });
```

---

## 6. 移行による改善点

### 6.1 バックエンド層の改善

| 項目 | 現状の実装 | LangChain導入後 |
|------|-----------|----------------|
| エージェントワークフロー | 独自実装または未対応 | `AgentExecutor`で標準化 |
| RAG | 独自実装 | `ConversationalRetrievalQAChain`等で標準化 |
| プロンプト管理 | 文字列連結 | `PromptTemplate`でテンプレート化 |
| メモリ管理 | 手動実装 | `BufferMemory`等で標準化 |
| ツール定義 | 独自形式 | `DynamicTool`等で標準化 |
| 出力パース | 手動パース | `StructuredOutputParser`等で標準化 |

### 6.2 フロントエンド層の改善

| 項目 | 現状の実装 | LangChain導入後 |
|------|-----------|----------------|
| 状態管理 | `useState`×5、`useEffect`複雑制御 | Vercel AI SDKの`useChat`と併用推奨 |
| ストリーミング | `parseSSEStream`手動実装 | `streamLog`等の標準メソッド |
| エラーリトライ | 自前実装なし | `RunnableRetry`で標準化 |
| ツール表示 | `StreamingSteps`コンポーネント自前実装 | Agentの中間ステップ自動追跡 |

---

## 7. 移行フェーズ詳細

### 7.1 Phase 0: 準備（1-2週間）

#### タスク詳細
1. **現状機能マッピング**
   - `lib/llm/types.ts`の型定義をLangChainの型と対比
   - `lib/llm/clients/grok.ts`の機能をLangChainのモデルと対比
   - 必要なChain/Agentパターンの選定

2. **技術検証環境構築**
   - 別ブランチでLangChainパッケージインストール
   - 最小構成のChain作成
   - 最小構成のAgent作成
   - 既存機能との動作比較テスト

3. **チーム内知識共有**
   - LangChain公式ドキュメント読み合わせ
   - LCEL（LangChain Expression Language）の学習
   - 技術検証結果のデモ
   - 移行ガイドライン草案レビュー

#### 成果物
- 機能マッピング表（現状→LangChain対応表）
- 技術検証レポート（動作確認済みサンプル）
- 移行ガイドライン草案

---

### 7.2 Phase 1: パイロット導入（2-4週間）

#### 対象機能選定基準
- 影響範囲が小さい機能（新規機能または独立した機能）
- エージェント機能が必要な機能
- RAG（文書検索）を使用する機能

#### 実装内容
1. **基本Chainの導入**
   - `LLMChain`またはLCELでの基本Chain実装
   - `PromptTemplate`でのプロンプト管理
   - エラーハンドリングの標準化

2. **Agentの導入（必要な場合）**
   - `AgentExecutor`でのAgent実行
   - `DynamicTool`でのツール定義
   - 中間ステップの追跡と表示

3. **検証項目**
   - 機能的同等性（レスポンス内容、表示形式）
   - パフォーマンス比較（レイテンシ、メモリ使用量）
   - エラーハンドリング動作（ネットワークエラー、APIエラー）

#### 成果物
- パイロット機能（LangChain使用）
- パフォーマンス比較レポート
- 移行ガイドライン正式版

---

### 7.3 Phase 2: 段階的移行（1-2ヶ月）

#### 移行優先度基準

| 優先度 | 基準 | 対象例 |
|-------|------|--------|
| 高 | エージェント機能が必要、RAGが必要 | 自律的タスク実行、文書検索チャット |
| 中 | プロンプト管理の複雑化、ツール連携 | 複雑なプロンプトを使用する機能 |
| 低 | 現状安定、変更リスク大 | シンプルなチャット（Vercel AI SDK併用検討） |

#### 移行手順（各機能ごと）
1. **バックエンド移行**
   - 既存API RouteをLangChain版に置き換え
   - Chain/Agentの定義
   - エラーレスポンス形式の統一

2. **フロントエンド移行**
   - Vercel AI SDKの`useChat`と併用（推奨）
   - またはLangChainのストリーミング対応
   - ツール呼び出し表示の調整

3. **テスト**
   - 単体テスト（Chain、Agent）
   - 統合テスト（E2E）
   - 回帰テスト（既存機能への影響確認）

#### 成果物
- 移行済み機能一覧
- テスト結果レポート
- 既知の問題と対応表

---

### 7.4 Phase 3: 高度機能の導入（2-3ヶ月）

#### 導入対象
- RAG（Retrieval-Augmented Generation）
  - Vector Store（Pinecone、Weaviate、Supabase等）
  - Document Loader（PDF、Webページ等）
  - `ConversationalRetrievalQAChain`

- 高度なAgentパターン
  - `PlanAndExecute` Agent
  - `ReAct` Agent
  - マルチAgentシステム

- メモリ管理の高度化
  - `ConversationSummaryMemory`
  - `VectorStoreRetrieverMemory`

#### レガシーコード整理
1. **削除対象**
   - 独自のプロンプト構築ロジック
   - 手動のツール呼び出し管理
   - 独自のRAG実装（あれば）

2. **保持対象（ラッパー化）**
   - `lib/llm/types.ts`（LangChain型の再エクスポート）
   - `lib/llm/config.ts`（プロバイダー設定）

#### ドキュメント更新
- API仕様書（レスポンス形式変更反映）
- 開発者ガイド（LangChain使用法）
- トラブルシューティング（移行時の注意点）

#### 成果物
- 高度機能を導入したコードベース
- 更新された技術仕様書
- 開発者向け移行ガイド

---

### 7.5 Phase 4: Vercel AI SDK併用検討（必要に応じて）

#### 検討タイミング
- シンプルなチャット機能が多数存在する場合
- ストリーミングUIの実装を簡潔にしたい場合
- bundle size の削減が必要な場合

#### 併用パターン

```typescript
// シンプルなチャット: Vercel AI SDK
// app/api/simple-chat/route.ts
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: grok('grok-4-1-fast'),
    messages,
  });
  return result.toDataStreamResponse();
}

// 複雑なエージェント: LangChain
// app/api/agent/route.ts
import { AgentExecutor } from 'langchain/agents';

export async function POST(req: Request) {
  const { input } = await req.json();
  const executor = AgentExecutor.fromAgentAndTools({...});
  const result = await executor.invoke({ input });
  return Response.json(result);
}
```

---

## 8. 具体的な実装手順

### 8.1 パッケージインストール

```bash
# コアパッケージ
npm install @langchain/core

# モデルプロバイダー
npm install @langchain/openai
npm install @langchain/anthropic
npm install @langchain/xai  # xAI対応パッケージ（存在する場合）

# コミュニティ統合
npm install @langchain/community

# オプション: Vector Store
npm install @langchain/pinecone
npm install @langchain/supabase

# オプション: Document Loader
npm install @langchain/document-loaders

# オプション: 観測性
npm install langsmith
```

### 8.2 バックエンド実装パターン

#### 基本Chainパターン

```typescript
// app/api/chat/route.ts
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI({
  model: 'gpt-4',
  temperature: 0.7,
});

const prompt = PromptTemplate.fromTemplate(`
  You are a helpful assistant.
  
  User: {input}
  Assistant:
`);

const chain = RunnableSequence.from([
  prompt,
  model,
  new StringOutputParser(),
]);

export async function POST(req: Request) {
  const { input } = await req.json();
  
  const result = await chain.invoke({ input });
  
  return Response.json({ content: result });
}
```

#### ストリーミング対応

```typescript
// app/api/chat/stream/route.ts
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  model: 'gpt-4',
  streaming: true,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const stream = await model.stream(messages);
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
```

#### Agentパターン

```typescript
// app/api/agent/route.ts
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { DynamicTool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const tools = [
  new DynamicTool({
    name: 'search',
    description: 'Search for information',
    func: async (input: string) => {
      // 検索処理
      return 'Search results...';
    },
  }),
];

const model = new ChatOpenAI({ model: 'gpt-4' });

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant.'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

const agent = await createOpenAIFunctionsAgent({
  llm: model,
  tools,
  prompt,
});

const executor = new AgentExecutor({
  agent,
  tools,
});

export async function POST(req: Request) {
  const { input } = await req.json();
  const result = await executor.invoke({ input });
  return Response.json(result);
}
```

#### RAGパターン

```typescript
// app/api/rag/route.ts
import { ChatOpenAI } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const vectorStore = await SupabaseVectorStore.fromExistingIndex(
  new OpenAIEmbeddings(),
  {
    client: supabase,
    tableName: 'documents',
  }
);

const retriever = vectorStore.asRetriever();

const model = new ChatOpenAI({ model: 'gpt-4' });

// ConversationalRetrievalQAChainまたはLCELで実装
const chain = RunnableSequence.from([
  {
    context: retriever.pipe(formatDocs),
    question: (input: { question: string }) => input.question,
  },
  prompt,
  model,
  new StringOutputParser(),
]);

export async function POST(req: Request) {
  const { question } = await req.json();
  const result = await chain.invoke({ question });
  return Response.json({ answer: result });
}
```

### 8.3 フロントエンド実装パターン

#### Vercel AI SDKとの併用（推奨）

```typescript
// components/Chat.tsx
'use client';

import { useChat } from '@ai-sdk/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',  // LangChainバックエンド
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

### 8.4 既存コードからの移行手順

#### Step 1: 型定義の対応

```typescript
// lib/llm/types.ts
// 既存の型をLangChainの型にマッピング

import type { BaseMessage } from '@langchain/core/messages';

// 既存コードとの互換性のためのエイリアス
export type LLMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// LangChain用の変換関数
export function toLangChainMessages(messages: LLMMessage[]): BaseMessage[] {
  // 変換ロジック
}
```

#### Step 2: API Routeの移行

```typescript
// app/api/llm/stream/route.ts
// 既存実装を残しつつ、LangChain版を追加

import { legacyStreamHandler } from './legacy';
import { langchainStreamHandler } from './langchain';

const USE_LANGCHAIN = process.env.USE_LANGCHAIN === 'true';

export async function POST(req: Request) {
  if (USE_LANGCHAIN) {
    return langchainStreamHandler(req);
  }
  return legacyStreamHandler(req);
}
```

#### Step 3: フロントエンドの移行

```typescript
// components/ui/FeatureChat.tsx
// 既存コンポーネントをラップして段階的に移行

import { LegacyChat } from './LegacyChat';
import { LangChainChat } from './LangChainChat';

const USE_LANGCHAIN = process.env.NEXT_PUBLIC_USE_LANGCHAIN === 'true';

export function FeatureChat(props: FeatureChatProps) {
  if (USE_LANGCHAIN) {
    return <LangChainChat {...props} />;
  }
  return <LegacyChat {...props} />;
}
```

---

## 9. 検証・テスト計画

### 9.1 検証項目一覧

| 検証項目 | 検証方法 | 合格基準 |
|---------|---------|---------|
| Chain実行 | 手動テスト | 期待通りの出力が得られる |
| Agent実行 | 手動テスト | ツールが正しく呼び出され結果が表示 |
| ストリーミング | 手動テスト | 文字が順次表示される、遅延なし |
| RAG検索 | 手動テスト | 関連文書が取得され回答に反映される |
| エラーハンドリング | 手動テスト（APIキー無効化等） | 適切なエラーメッセージが表示 |
| パフォーマンス | 計測（React DevTools等） | 既存実装と同等以上のパフォーマンス |
| メモリ管理 | 計測（Chrome DevTools） | 長時間会話でもメモリ増加が抑制される |

### 9.2 自動テスト戦略

#### 単体テスト

```typescript
// __tests__/lib/llm/chain.test.ts
import { describe, it, expect } from 'vitest';
import { myChain } from '@/lib/llm/langchain/chain';

describe('MyChain', () => {
  it('should return expected output', async () => {
    const result = await myChain.invoke({ input: 'Hello' });
    expect(result).toContain('expected');
  });
});
```

#### E2Eテスト

```typescript
// tests/chat.spec.ts
import { test, expect } from '@playwright/test';

test('langchain chat works', async ({ page }) => {
  await page.goto('/chat');
  
  await page.fill('[data-testid="chat-input"]', 'Hello');
  await page.click('[data-testid="send-button"]');
  
  await expect(page.locator('[data-testid="message-content"]')).toContainText('Hello');
});
```

### 9.3 パフォーマンス比較

```typescript
// 計測スクリプト
import { performance } from 'perf_hooks';

async function measurePerformance() {
  const start = performance.now();
  
  // LangChain版の呼び出し
  const result = await chain.invoke({ input: 'Hello' });
  
  const end = performance.now();
  
  return {
    totalTime: end - start,
    outputLength: result.length,
  };
}
```

---

## 10. リスクと対策

### 10.1 技術的リスク

| リスク | 内容 | 対策 |
|--------|------|------|
| 学習曲線 | 抽象化レイヤーが多く習得に時間がかかる | 段階的な導入、ドキュメント整備、ペアプログラミング |
| バージョン移行 | 破壊的変更が頻繁 | 安定版（v0.3.x）を使用、変更ログの確認 |
| bundle size | パッケージサイズが大きくなる | tree-shaking、必要な機能のみインポート |
| ストリーミング複雑さ | プロバイダーによって挙動が異なる | 十分な検証、Vercel AI SDK併用検討 |

### 10.2 運用リスク

| リスク | 内容 | 対策 |
|--------|------|------|
| 学習コスト | チーム全体の習得時間 | ドキュメント整備、ペアプログラミング、技術検証共有 |
| 移行中断 | 他優先タスクによる中断 | 段階的アプローチで影響最小化、各Phaseを独立完了可能に |
| 品質低下 | 移行によるバグ混入 | 十分なテスト、段階的リリース、ロールバック計画 |
| ドキュメント分散 | 公式ドキュメントが複数サイトに分散 | 使用バージョンのドキュメントを明確化 |

---

## 11. トラブルシューティングガイド

### 11.1 よくある問題と解決策

#### 問題1: モデルが応答しない

**症状**: Chain/Agentの実行でレスポンスが返ってこない

**確認事項**:
1. APIキーが正しく設定されているか
2. モデル名が正しいか
3. レート制限に達していないか

**解決策**:
```typescript
// デバッグ用ログを追加
const model = new ChatOpenAI({
  model: 'gpt-4',
  callbacks: [
    {
      handleLLMStart: async (llm, prompts) => {
        console.log('LLM Start:', prompts);
      },
      handleLLMEnd: async (output) => {
        console.log('LLM End:', output);
      },
      handleLLMError: async (error) => {
        console.error('LLM Error:', error);
      },
    },
  ],
});
```

#### 問題2: ツール呼び出しが動作しない

**症状**: ツールが定義されているが呼び出されない、またはエラーになる

**確認事項**:
1. ツールの`description`が適切か
2. パラメータのスキーマが正しいか
3. Agentタイプがツール呼び出しに対応しているか

**解決策**:
```typescript
// ツール定義の確認
const tool = new DynamicTool({
  name: 'myTool',
  description: '明確で具体的な説明を記載',
  func: async (input: string) => {
    console.log('Tool called with:', input); // デバッグログ
    // ...
  },
});

// Agentタイプの確認
const agent = await createOpenAIFunctionsAgent({  // Functions対応Agent
  llm: model,
  tools,
  prompt,
});
```

#### 問題3: 出力パースエラー

**症状**: LLMの出力が期待する形式と異なり、パースエラーになる

**確認事項**:
1. OutputParserの設定が正しいか
2. プロンプトに出力形式の指示が含まれているか
3. フォールバック戦略が設定されているか

**解決策**:
```typescript
import { OutputFixingParser } from 'langchain/output_parsers';

// フォールバック付きパーサー
const parser = OutputFixingParser.fromLLM(
  new ChatOpenAI({ model: 'gpt-4' }),
  baseParser
);

const chain = RunnableSequence.from([
  prompt,
  model,
  parser,  // エラー時に自動修正を試行
]);
```

### 11.2 デバッグ手法

#### Callbacksによる追跡

```typescript
import { ConsoleCallbackHandler } from '@langchain/core/tracers/console';

const chain = new LLMChain({
  llm: model,
  prompt,
  callbacks: [new ConsoleCallbackHandler()],  // コンソールにログ出力
});
```

#### LangSmithによる観測

```typescript
// .env.local
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_api_key
LANGCHAIN_PROJECT=your_project

// コード
const chain = new LLMChain({
  llm: model,
  prompt,
  tags: ['debug'],  // LangSmithでフィルタリング可能
});
```

### 11.3 サポート・問い合わせ先

| リソース | URL | 用途 |
|---------|-----|------|
| 公式ドキュメント | https://js.langchain.com/docs | 基本的な使用方法 |
| APIリファレンス | https://api.js.langchain.com | 詳細なAPI仕様 |
| GitHub Issues | https://github.com/langchain-ai/langchainjs/issues | バグ報告、機能要望 |
| Discord | https://discord.gg/langchain | コミュニティサポート |
| 社内Slack | #dev-langchain | 社内での知見共有 |

---

## 12. 参考情報

### 12.1 公式ドキュメント
- [LangChain JS 公式ドキュメント](https://js.langchain.com/docs/introduction)
- [LangChain Core ドキュメント](https://api.js.langchain.com/modules/_langchain_core.html)
- [LangChain Community ドキュメント](https://js.langchain.com/docs/integrations/platforms/)
- [LCEL（LangChain Expression Language）](https://js.langchain.com/docs/expression_language/)

### 12.2 関連ドキュメント
- [LLM統合仕様](../../specs/api-integration/llm-integration.md)
- [LLMフレームワーク比較](../../specs/api-integration/llm-framework-comparison.md)
- [Vercel AI SDK 移行計画](../archive/vercel-ai-sdk-migration-plan.md)

### 12.3 現状実装ファイル
- `app/api/llm/stream/route.ts` - API Route層
- `lib/llm/factory.ts` - Factoryパターン
- `lib/llm/clients/grok.ts` - Grokクライアント
- `lib/llm/types.ts` - 型定義
- `components/ui/StreamingMessage.tsx` - ストリーミングフック
- `components/ui/FeatureChat.tsx` - チャットUI

---

## 13. 承認

| 役割 | 名前 | 承認日 | コメント |
|------|------|--------|---------|
| 技術責任者 | | | |
| プロジェクトマネージャー | | | |

---

## 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2026-02-21 | AI開発エージェント | 初版作成（Vercel AI SDK版をベースにLangChain版として作成） |
