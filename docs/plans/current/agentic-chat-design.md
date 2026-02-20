# エージェンティックチャット回答設計

> **全チャット機能で共通のエージェント的振る舞いを実現する設計**
>
> **作成日**: 2026-02-20 20:00

---

## 1. 概要

### 1.1 目的

現在のチャット機能は「質問→回答」の単純な対話形式だが、以下のような**エージェンティックな振る舞い**を全機能で共通して実現したい：

| 現状 | 目標 |
|------|------|
| 受動的な回答 | **自律的な情報収集**（ツール使用） |
| 単発の回答 | **ステップごとの進捗表示** |
| テキストのみ | **構造化された出力** |
| 結果のみ表示 | **思考プロセスの可視化** |

### 1.2 エージェンティックの定義

本設計における「エージェンティック」とは：

1. **自律性**: ユーザー意図を理解し、必要なツールを自ら選択・実行
2. **透明性**: 何を考え、何を実行しているかをリアルタイムに表示
3. **構造化**: 結果を見やすく整理して提示
4. **継続性**: 複数ステップにわたる処理を追跡可能

---

## 2. 既存実装の分析

### 2.1 すでにあるもの

| コンポーネント | 機能 | 場所 |
|--------------|------|------|
| `ToolCallIndicator` | ツール実行状態の表示 | `components/chat/ToolCallIndicator.tsx` |
| `ReasoningSteps` | 思考プロセスの表示 | `components/chat/ReasoningSteps.tsx` |
| `ProcessingFlow` | 処理ステップの可視化 | `components/chat/ProcessingFlow.tsx` |
| `StreamingMessage` | ストリーミング表示統合 | `components/ui/StreamingMessage.tsx` |
| `useLLM` | LLM連携フック | `hooks/use-llm.ts` |
| Grok Tools | Web/X検索、コード実行 | `lib/llm/clients/grok.ts` |

### 2.2 現在の課題

```typescript
// 現状: FeatureChatはシンプルなストリーミングのみ
const { streamState, startStream } = useLLM();
// → ツール使用状況や思考ステップが表示されない場合がある
```

1. **機能ごとに表示が統一されていない**
   - リサーチ機能はツール表示あり
   - 一般チャットはシンプルなテキストのみ

2. **システムプロンプトがエージェント的でない**
   - ツール使用を促す指示が不十分
   - ステップバイステップの思考を促していない

3. **UIの統一性がない**
   - 同じ情報でも表示方法が機能によって異なる

---

## 3. 設計方針

### 3.1 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      ユーザーインターフェース                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ ToolIndicator │  │ 思考プロセス  │  │  最終回答    │        │
│  │  (ツール表示) │  │ (折りたたみ) │  │ (構造化表示) │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      エージェントレイヤー                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              統合システムプロンプト                     │  │
│  │  - ツール使用指示                                       │  │
│  │  - 思考プロセスの可視化指示                              │  │
│  │  - 構造化出力指示                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ツール選択・実行エンジン                   │  │
│  │  - Web検索 (grok)                                     │  │
│  │  - X検索 (grok)                                       │  │
│  │  - コード実行 (grok)                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 全機能共通のエージェントプロンプト

すべてのチャット機能で共通の「エージェント的振る舞い」を定義：

```typescript
// lib/prompts/db.ts の DEFAULT_PROMPTS に追加
const AGENTIC_BASE_PROMPT = `## エージェント的振る舞いの原則

あなたは自律的に情報を収集・整理するAIアシスタントです。

### 1. ツール使用の原則
- 最新情報が必要な場合は **Web検索** を使用
- ソーシャルトレンドが必要な場合は **X検索** を使用
- 計算・データ分析が必要な場合は **コード実行** を使用
- 複数のツールを組み合わせて包括的な回答を作成

### 2. 思考プロセスの可視化
回答を生成する前に、以下の思考ステップを明示：
1. **分析**: ユーザーの意図を分析
2. **計画**: 必要な情報収集を計画
3. **実行**: ツールを使用して情報収集
4. **統合**: 収集した情報を統合・整理
5. **出力**: 構造化された回答を生成

### 3. 出力形式
必ず以下の構造で回答：

\`\`\`
## 思考プロセス
（ステップごとの思考内容）

## 情報収集
（使用したツールと取得した情報の要約）

## 回答
（メインの回答内容 - 構造化して表示）

## 参考情報
（情報源・関連リンク）
\`\`\`
`;
```

### 3.3 機能別プロンプトとの統合

各機能のプロンプトにエージェント的振る舞いを追加：

```typescript
// 例: 出演者リサーチの場合
const RESEARCH_CAST_AGENTIC = `${AGENTIC_BASE_PROMPT}

## 出演者リサーチの専門指示

あなたはテレビ制作の出演者リサーチ専門家です。

### リサーチ手順
1. **企画分析**: 入力された企画内容を分析
2. **候補検索**: Web検索で候補者を探索
3. **トレンド確認**: X検索で話題性を確認
4. **相性分析**: 候補者同士の相性を分析
5. **レポート作成**: 構造化されたレポートを出力

### 出力形式
## 思考プロセス
（各ステップの分析内容）

## 推奨出演者候補（3〜5名）
| 名前 | プロフィール | 推奨理由 | 話題性 |
|------|-------------|---------|--------|
| ... | ... | ... | ... |

## 相性分析
...

## 注意事項・リスク
...

## 参考情報
- 検索した情報源
- 関連リンク
`;
```

---

## 4. UI/UX設計

### 4.1 統一表示コンポーネント

すべてのチャットで共通の表示パターン：

```typescript
// components/chat/AgenticResponse.tsx
interface AgenticResponseProps {
  // ツール実行状態
  toolCalls: ToolCallInfo[];
  // 思考ステップ
  reasoningSteps: ReasoningStepInfo[];
  // メインコンテンツ
  content: string;
  // 使用状況
  usage?: UsageInfo;
  // 完了状態
  isComplete: boolean;
}
```

### 4.2 表示パターン

#### Phase 1: 初期表示（入力直後）
```
🤔 意図を分析中...
```

#### Phase 2: ツール実行中
```
🔍 Web検索 [実行中...]
🐦 X検索   [完了 ✓]
💻 コード実行 [待機中]
```

#### Phase 3: 思考プロセス（折りたたみ可能）
```
🧠 思考プロセス (1,234 トークン) [展開▼]
```

#### Phase 4: 最終回答（構造化）
```markdown
## 推奨出演者候補
...

## 相性分析
...
```

#### Phase 5: 使用サマリー（完了後）
```
Web検索: 3回 • X検索: 2回 • 1,234 入力 / 567 出力
```

### 4.3 機能別カスタマイズ

| 機能 | デフォルトツール | 特殊表示 |
|------|----------------|---------|
| 一般チャット | Web検索 | シンプル |
| 出演者リサーチ | Web + X検索 | 候補者カード |
| 場所リサーチ | Web検索 | マップ候補 |
| 情報リサーチ | Web + X検索 | 情報カード |
| エビデンス | Web検索 | 検証結果 |
| 議事録作成 | なし | 構造化表示 |
| 新企画立案 | Web + X検索 | 企画書形式 |
| NA原稿作成 | なし | 原稿形式 |

---

## 5. 実装計画

### 5.1 Phase 1: システムプロンプト更新

1. **エージェント基本プロンプトの作成**
   - `lib/prompts/db.ts` に `AGENTIC_BASE_PROMPT` を追加
   - DBマイグレーションで既存プロンプトを更新

2. **機能別プロンプトの更新**
   - 各機能のプロンプトにエージェント指示を統合
   - ツール使用を促す指示を追加

### 5.2 Phase 2: UIコンポーネント統合

1. **AgenticResponseコンポーネント作成**
   - `components/chat/AgenticResponse.tsx` 新規作成
   - 既存コンポーネントの統合ラッパー

2. **FeatureChatへの統合**
   - `ToolCallIndicator` の表示追加
   - `ReasoningSteps` の表示追加
   - 構造化出力のサポート

### 5.3 Phase 3: ツール設定の統一

1. **機能別ツール設定の定義**
   ```typescript
   // lib/chat/chat-config.ts
   const featureToolConfig: Record<ChatFeatureId, ToolOptions> = {
     "research-cast": { enableWebSearch: true, enableXSearch: true },
     "research-info": { enableWebSearch: true, enableXSearch: true },
     "general-chat": { enableWebSearch: true },
     // ...
   };
   ```

2. **Grokツール設定との連携**
   - 管理画面でのツール有効/無効を尊重
   - 機能別デフォルトとユーザー設定のマージ

### 5.4 Phase 4: ストリーミング対応の強化

1. **useLLMフックの拡張**
   - ツール呼び出しイベントの処理
   - 思考ステップイベントの処理

2. **APIレスポンスの拡張**
   - `/api/llm/stream` でツール使用状況を返す
   - 思考プロセスのストリーミング

---

## 6. 技術仕様

### 6.1 データフロー

```
ユーザー入力
    ↓
[システムプロンプト + エージェント指示] を付与
    ↓
LLM API (Grok with Tools)
    ↓
ストリーミングレスポンス
    ├── ツール呼び出しイベント → ToolCallIndicator
    ├── 思考ステップイベント → ReasoningSteps
    └── コンテンツチャンク → メッセージ表示
    ↓
最終回答（構造化）
```

### 6.2 型定義

```typescript
// types/agentic-chat.ts

interface AgenticChatState {
  // 入力
  input: string;
  
  // 処理状態
  phase: 'analyzing' | 'planning' | 'executing' | 'synthesizing' | 'complete';
  
  // ツール実行
  toolCalls: ToolCallInfo[];
  
  // 思考プロセス
  reasoningSteps: ReasoningStepInfo[];
  
  // 出力
  content: string;
  structuredOutput?: StructuredOutput;
  
  // メタ情報
  usage?: UsageInfo;
  duration?: number;
}

interface StructuredOutput {
  sections: {
    title: string;
    content: string;
    type: 'thinking' | 'tools' | 'main' | 'references';
  }[];
}
```

### 6.3 プロンプトキー追加

```typescript
// lib/prompts/db.ts
export const PROMPT_KEYS = {
  // ...既存キー...
  
  // エージェント基本プロンプト
  AGENTIC_BASE: "AGENTIC_BASE",
  
  // 機能別エージェントプロンプト
  AGENTIC_RESEARCH_CAST: "AGENTIC_RESEARCH_CAST",
  AGENTIC_RESEARCH_LOCATION: "AGENTIC_RESEARCH_LOCATION",
  AGENTIC_RESEARCH_INFO: "AGENTIC_RESEARCH_INFO",
  AGENTIC_RESEARCH_EVIDENCE: "AGENTIC_RESEARCH_EVIDENCE",
  AGENTIC_MINUTES: "AGENTIC_MINUTES",
  AGENTIC_PROPOSAL: "AGENTIC_PROPOSAL",
  AGENTIC_NA_SCRIPT: "AGENTIC_NA_SCRIPT",
};
```

---

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [grok-agent-tools.md](../../specs/api-integration/grok-agent-tools.md) | GrokツールAPI仕様 |
| [prompt-engineering.md](../../specs/api-integration/prompt-engineering.md) | プロンプト設計方針 |
| [system-prompt-management.md](../../specs/api-integration/system-prompt-management.md) | プロンプト管理仕様 |
| [llm-integration.md](../../specs/api-integration/llm-integration.md) | LLM統合仕様 |

---

## 8. 更新履歴

| 日時 | 内容 | 担当 |
|------|------|------|
| 2026-02-20 20:00 | 初版作成 | AI Agent |
| 2026-02-20 20:15 | Phase 1完了: エージェント基本プロンプト作成・DB更新 | AI Agent |
| 2026-02-20 20:25 | Phase 2完了: AgenticResponseコンポーネント作成 | AI Agent |

### Phase 2 実装詳細

#### 変更ファイル
- `components/chat/AgenticResponse.tsx`（新規）
  - ツール呼び出し表示 (`ToolCallIndicator`)
  - 思考ステップ表示 (`ReasoningSteps`)
  - ツール使用サマリー (`ToolUsageSummary`)
  - 使用状況表示 (`UsageInfo`)
  - 2つのバリアント: `default` と `chat`

#### コンポーネント構成
```
AgenticResponse
├── ToolCallIndicator (ツール実行状態)
├── ReasoningSteps (思考プロセス - 折りたたみ可能)
├── Message Content (メインコンテンツ)
└── UsageInfo (トークン/ツール使用状況)
```

#### 主な機能
- ツール実行状態のリアルタイム表示
- 思考プロセスの折りたたみ表示
- 構造化された回答表示
- 使用状況サマリー（トークン数、コスト、ツール使用回数）

### Phase 1 実装詳細

#### 変更ファイル
- `lib/prompts/db.ts`
  - `AGENTIC_BASE_PROMPT` を追加（全機能共通のエージェント的振る舞い定義）
  - 全プロンプトをエージェンティック版に更新
  - `PROMPT_KEYS` に `AGENTIC_BASE` を追加

- `scripts/update-agentic-prompts.ts`（新規）
  - DB更新用スクリプト

#### DB更新内容
- `AGENTIC_BASE` プロンプトを新規追加
- 既存11個のプロンプトをエージェンティック版に更新（バージョンアップ）

#### エージェント基本プロンプトの主な内容
1. **ツール使用の原則**: Web検索、X検索、コード実行の適切な使い分け
2. **思考プロセスの可視化**: 分析→計画→実行→統合→出力の5ステップ
3. **構造化された出力形式**: 思考プロセス、情報収集、回答、参考情報の4セクション
4. **回答の原則**: 簡潔さ、構造化、情報源の引用
