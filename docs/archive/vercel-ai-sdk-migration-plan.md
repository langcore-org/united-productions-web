# Vercel AI SDK 導入計画書

> **Next.jsプロジェクトへのVercel AI SDK段階的導入計画**
>
> **作成日**: 2026-02-21 19:00
> **更新日**: 2026-02-21 19:15
> **調査基準日**: 2026-02-21（AI SDK v4安定版、v6ベータ版情報を含む）

---

## 1. 計画概要

### 1.1 目的

現在の独自実装（`lib/llm/`）における以下の課題を解決する：

- ストリーミング処理の複雑さ（SSE生成、エラーハンドリング）
- チャットUIの状態管理（スクロール制御、メッセージ更新）
- ツール呼び出しの標準化
- マルチプロバイダー対応の工数

### 1.2 方針

**Vercel AI SDKを段階的に導入し、複雑なエージェント機能が必要になった時点でLangChain併用を検討する。**

---

## 2. 移行のメリット・デメリット・注意点

### 2.1 メリット

#### 短期的メリット（導入直後）

| 項目 | 詳細 | 期待効果 |
|------|------|---------|
| 開発速度向上 | ストリーミング処理が数行で実装可能に | 新機能開発工数を約50-70%削減 |
| バグ削減 | SSEパース、状態管理等の標準化 | ストリーミング関連バグを大幅減少 |
| コード削減 | ボイラープレートコードの削除 | `lib/llm/`のコード量を約60%削減見込み |
| テスト容易性 | 標準化されたインターフェース | 単体テストの作成工数削減 |

#### 中長期的メリット（導入後3-6ヶ月）

| 項目 | 詳細 | 期待効果 |
|------|------|---------|
| 新プロバイダー追加の容易さ | モデル文字列変更だけで切り替え可能 | 新LLM導入工数を数日→数時間に短縮 |
| チーム全体の生産性 | 標準パターンによる認知負荷軽減 | 新メンバーの onboarding 期間短縮 |
| メンテナンス性 | Vercel社の公式サポート | 長期的な安定性確保、セキュリティアップデート自動化 |
| コミュニティ活用 | 豊富なサンプル・ドキュメント | 問題解決のための情報収集が容易に |

### 2.2 デメリット

#### 技術的デメリット

| 項目 | 詳細 | 影響範囲 |
|------|------|---------|
| カスタム機能の制限 | 独自のSSEフォーマット、特殊なエラーハンドリング等が制限される | `reasoningSteps`の独自パース等、現状のカスタム機能 |
| 抽象化のオーバーヘッド | 標準化レイヤーによるわずかなパフォーマンス低下 | レイテンシが数10ms増加する可能性 |
| ベンダーロックイン | Vercel AI SDK固有のAPIに依存 | 将来的なフレームワーク変更時の移行コスト |
| 学習コスト | 新フレームワークの習得に時間が必要 | チーム全員の学習期間（数時間〜数日） |

#### 運用・管理デメリット

| 項目 | 詳細 | 対応策 |
|------|------|--------|
| 移行期間中の複雑化 | 新旧コードの混在による可読性低下 | 明確な移行スケジュール設定、迅速な移行完了 |
| 既存知識の陳腐化 | 独自実装の知識が使えなくなる | 移行記録の文書化、設計判断の記録 |
| 移行作業の工数 | 計画・実装・テストに工数が必要 | 段階的アプローチでリスク分散 |

### 2.3 注意点

#### 技術的注意点

1. **レスポンス形式の互換性**
   - AI SDKのSSE形式は`data: {...}`形式だが、現状の独自形式と細部が異なる可能性
   - フロントエンドのパース処理への影響を確認必要

2. **ツール呼び出しの動作差異**
   - 現状のツール呼び出しはxAI Responses API固有の実装
   - AI SDKのツール呼び出しは標準化されているが、挙動が完全に同一か要検証

3. **エラーハンドリングの変更**
   - 現状は細かなエラーログを独自に出力
   - AI SDKのエラーハンドリングに移行する際、ログの欠損がないか確認必要

4. **usage情報の記録**
   - 現状は`trackUsage`関数で手動記録
   - AI SDKではミドルウェア方式または別途実装が必要

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
   - AI SDKのバージョンアップデート方針を決定
   - セキュリティアップデートの監視体制

### 2.4 現状の該当性分析

#### カスタム機能の有無（該当するか？）

| カスタム機能 | 現状 | AI SDK対応 | 該当性 |
|------------|------|-----------|--------|
| SSEフォーマット | 標準的な`data: {...}`形式 | ✅ 互換性あり | 該当しない |
| 独自イベント型 | `content`, `thinking`, `toolCall`, `reasoning`, `toolUsage` | ⚠️ `toolInvocations`等に変更必要 | **該当する** |
| `reasoningSteps`パース | `parseSubSteps`で独自パース | ❌ 非対応、別途実装必要 | **該当する** |
| ツール状態管理 | `pending`→`running`→`completed` | ✅ 自動管理 | 該当しない |
| usage手動記録 | `trackUsage`関数で手動 | ⚠️ ミドルウェア方式に変更 | 軽微 |

**結論**: 中程度に該当する。`reasoningSteps`の独自パース等、一部カスタム機能に対応策が必要。

#### 移行を進めるべき状況
- ✅ ストリーミング関連のバグが頻発している
- ✅ 新しいLLMプロバイダーを追加したい
- ✅ チャット機能の拡張が予定されている
- ✅ チームにNext.js/Vercelの知見が豊富
- ⚠️ **カスタム機能ありだが、対応策が見えている（`reasoningSteps`はクライアント側でパース継続）**

#### 移行を見送るべき状況
- ❌ 現状の実装が安定しており、変更リスクが高い
- ❌ **カスタム機能が多すぎて対応策が見えない** ←現状は該当しない
- ❌ チームに新フレームワーク学習の余裕がない
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
const USE_AI_SDK = process.env.USE_AI_SDK === 'true';

// API Routeでの切り替え
export async function POST(req: Request) {
  if (USE_AI_SDK) {
    return handleWithAISDK(req);  // 新実装
  }
  return handleWithLegacy(req);   // 既存実装
}
```

**ロールバック手順（5分以内）:**
1. Vercel Dashboardで環境変数 `USE_AI_SDK=false` を設定
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
USE_AI_SDK=true
AI_SDK_ROLLOUT_PERCENTAGE=100

# .env.production（本番環境）
USE_AI_SDK=true
AI_SDK_ROLLOUT_PERCENTAGE=10  # 段階的に増加: 10 → 50 → 100
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
│   └── ai-sdk/          # 新実装
│       ├── clients/
│       ├── factory.ts
│       └── types.ts
```

#### 互換性レイヤーの設計

```typescript
// lib/llm/adapter.ts
// 新旧実装の互換性を保つアダプター

import { type Message as LegacyMessage } from './legacy/types';
import { type Message as AiSdkMessage } from 'ai';

export function toAiSdkMessages(
  legacyMessages: LegacyMessage[]
): AiSdkMessage[] {
  return legacyMessages.map(m => ({
    role: m.role,
    content: m.content,
    // その他の変換
  }));
}

export function fromAiSdkMessages(
  aiSdkMessages: AiSdkMessage[]
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
  - 複数イベントタイプ（`response.output_text.delta`, `response.reasoning_content.delta`等）の個別ハンドリング

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
  - 複数状態（`content`, `thinking`, `toolCalls`, `reasoningSteps`等）の個別管理
  - AbortControllerによる手動キャンセル処理
  - エラーハンドリングの自前実装

#### チャットUI
- **ファイル**: `components/ui/FeatureChat.tsx`
- **役割**: チャットインターフェース全体
- **現状の複雑さ**:
  - スクロール制御の自前実装（`isUserScrolling`フラグ管理）
  - メッセージ配列の手動更新
  - ツール呼び出し・思考ステップの個別表示ロジック
  - ローディング状態の手動管理

### 4.3 型定義層
- **ファイル**: `lib/llm/types.ts`
- **現状**: 独自の`LLMClient`インターフェース、`LLMMessage`型等を定義

---

## 5. Vercel AI SDK 概要

### 5.1 バージョン情報

| バージョン | ステータス | 主な特徴 |
|-----------|-----------|---------|
| v4.x | 安定版（推奨） | ストリーミング、ツール呼び出し、React Hooks |
| v6.x | ベータ版 | Agent抽象化、人間承認フロー |

### 5.2 構成要素

#### AI SDK Core
- **用途**: バックエンドのテキスト生成、ストリーミング、ツール呼び出し
- **主要関数**:
  - `generateText`: 同期的テキスト生成
  - `streamText`: ストリーミングテキスト生成（SSE自動生成）
  - `generateObject`: 構造化データ生成
  - `streamObject`: ストリーミング構造化データ

#### AI SDK UI
- **用途**: フロントエンドのReact Hooks
- **主要フック**:
  - `useChat`: メッセージ、入力、ローディング、エラーの自動管理
  - `useCompletion`: テキスト補完管理
  - `useObject`: ストリーミングJSON消費

---

## 6. 移行による改善点

### 6.1 バックエンド層の改善

| 項目 | 現状の実装 | Vercel AI SDK導入後 |
|------|-----------|-------------------|
| SSE生成 | `ReadableStream`手動構築、`data:`フォーマット手動生成 | `streamText()`の戻り値を`toDataStreamResponse()`で変換 |
| エラーハンドリング | try-catch分散、手動ログ出力 | 組み込みエラーハンドリング、自動ログ |
| ツール呼び出し | イベントタイプごとの個別パース、状態管理手動 | `tools`オプションで宣言的定義、自動実行 |
| usage記録 | 手動集計、個別DB保存処理 | ミドルウェアで自動収集（オプション） |
| プロバイダー切替 | Factoryパターンでの手動分岐 | モデル指定文字列（`grok-4-1-fast`等）で自動切替 |

### 6.2 フロントエンド層の改善

| 項目 | 現状の実装 | Vercel AI SDK導入後 |
|------|-----------|-------------------|
| 状態管理 | `useState`×5、`useEffect`複雑制御 | `useChat`フックで一括管理 |
| SSEパース | `parseSSEStream`手動実装 | `useChat`内部で自動処理 |
| スクロール制御 | `isUserScrolling`フラグ自前管理 | 自動スクロール制御（組み込み） |
| エラーリトライ | 自前実装なし | 自動リトライ機能（組み込み） |
| メッセージ更新 | `setMessages`手動呼び出し | ストリーム自動反映 |
| ツール表示 | `StreamingSteps`コンポーネント自前実装 | `useChat`の`toolInvocations`自動反映 |

---

## 7. 移行フェーズ詳細

### 7.1 Phase 0: 準備（1-2週間）

#### タスク詳細
1. **現状機能マッピング**
   - `lib/llm/types.ts`の型定義をAI SDKの型と対比
   - `lib/llm/clients/grok.ts`の機能をAI SDKのプロバイダー機能と対比
   - `components/ui/StreamingMessage.tsx`の状態管理を`useChat`の機能と対比

2. **技術検証環境構築**
   - 別ブランチで`ai`パッケージインストール
   - 最小構成のAPI Route（`streamText`使用）作成
   - 最小構成のReactコンポーネント（`useChat`使用）作成
   - 既存機能との動作比較テスト

3. **チーム内知識共有**
   - AI SDK公式ドキュメント読み合わせ
   - 技術検証結果のデモ
   - 移行ガイドライン草案レビュー

#### 成果物
- 機能マッピング表（現状→AI SDK対応表）
- 技術検証レポート（動作確認済みサンプル）
- 移行ガイドライン草案

---

### 7.2 Phase 1: パイロット導入（2-4週間）

#### 対象機能選定基準
- 影響範囲が小さい機能（新規機能または独立した機能）
- 既存のストリーミングバグがある機能
- ツール呼び出しを使用しないシンプルな機能

#### 実装内容
1. **API Layer移行**
   - 新規API Routeを`streamText`で実装
   - 既存の`createStreamResponse`ヘルパーと並行運用
   - エラーハンドリングをAI SDK標準に切り替え

2. **UI Layer移行**
   - 新規コンポーネントを`useChat`で実装
   - `StreamingSteps`等の自前コンポーネントをAI SDK標準表示に置き換え
   - スクロール制御を組み込み機能に委譲

3. **検証項目**
   - 機能的同等性（レスポンス内容、表示形式）
   - パフォーマンス比較（レイテンシ、メモリ使用量）
   - エラーハンドリング動作（ネットワークエラー、APIエラー）

#### 成果物
- パイロット機能（AI SDK使用）
- パフォーマンス比較レポート
- 移行ガイドライン正式版

---

### 7.3 Phase 2: 段階的移行（1-2ヶ月）

#### 移行優先度基準

| 優先度 | 基準 | 対象例 |
|-------|------|--------|
| 高 | ストリーミングバグあり、メンテナンス工数大 | `FeatureChat`のスクロール問題、複雑な状態管理 |
| 中 | 機能追加要求あり、将来の拡張性必要 | 新しいチャット機能、管理画面AI補助 |
| 低 | 現状安定、変更リスク大 | 既存の安定動作機能（移行対象外とする可能性） |

#### 移行手順（各機能ごと）
1. **バックエンド移行**
   - 既存API RouteをAI SDK版に置き換え
   - リクエスト/レスポンス形式の互換性確認
   - エラーレスポンス形式の統一

2. **フロントエンド移行**
   - `useLLMStream`呼び出しを`useChat`に置き換え
   - メッセージ表示コンポーネントをAI SDK標準に調整
   - ツール呼び出し表示を`toolInvocations`プロパティに移行

3. **テスト**
   - 単体テスト（API Route、コンポーネント）
   - 統合テスト（E2E）
   - 回帰テスト（既存機能への影響確認）

#### 成果物
- 移行済み機能一覧
- テスト結果レポート
- 既知の問題と対応表

---

### 7.4 Phase 3: 全面移行（2-3ヶ月）

#### 移行対象
- 残存の独自実装（`lib/llm/`配下）
- `StreamingMessage.tsx`等の共通コンポーネント
- 型定義のAI SDK準拠化

#### レガシーコード整理
1. **削除対象**
   - `parseSSEStream`等のSSEパース処理
   - 手動スクロール制御ロジック
   - 独自のツール呼び出し状態管理

2. **保持対象（ラッパー化）**
   - `lib/llm/types.ts`（AI SDK型の再エクスポート）
   - `lib/llm/config.ts`（プロバイダー設定）
   - `lib/llm/factory.ts`（プロバイダー名変換等）

#### ドキュメント更新
- API仕様書（レスポンス形式変更反映）
- 開発者ガイド（AI SDK使用法）
- トラブルシューティング（移行時の注意点）

#### 成果物
- 完全移行したコードベース
- 更新された技術仕様書
- 開発者向け移行ガイド

---

### 7.5 Phase 4: 高度化（必要に応じて）

#### 検討タイミング
- 複雑なエージェントワークフロー（自律的タスク実行）が必要になった時
- AI SDK v6（Agent抽象化）が安定版になった時

#### 選択肢評価
1. **Vercel AI SDK v6へアップグレード**
   - メリット: 同一生態系内でAgent機能を使用
   - デメリット: v6の学習コスト、破壊的変更リスク

2. **LangChain併用**
   - メリット: 複雑なエージェント機能をLangChain、シンプルなチャットをAI SDKで分担
   - デメリット: 2つのフレームワークの知識が必要、コードの複雑化

---

## 8. 具体的な実装手順

### 8.1 パッケージインストール

```bash
# AI SDK Core（バックエンド用）
npm install ai

# AI SDK UI（フロントエンド用）
npm install @ai-sdk/react

# プロバイダー別パッケージ
npm install @ai-sdk/openai
npm install @ai-sdk/anthropic
# xAIは現在 @ai-sdk/xai がないため、openai互換モードで使用
```

### 8.2 バックエンド実装パターン

#### 基本パターン

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const grok = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: grok('grok-4-1-fast'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

#### ツール呼び出し対応

```typescript
import { streamText, tool } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: grok('grok-4-1-fast'),
  messages,
  tools: {
    getWeather: tool({
      description: 'Get the weather for a location',
      parameters: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => {
        // ツール実行ロジック
        return { temperature: 20, condition: 'sunny' };
      },
    }),
  },
});
```

#### Usage記録（ミドルウェア）

```typescript
import { streamText, type StreamTextResult } from 'ai';

const result = streamText({
  model: grok('grok-4-1-fast'),
  messages,
  onFinish: async (completion) => {
    // usage情報をDBに記録
    await trackUsage({
      promptTokens: completion.usage.promptTokens,
      completionTokens: completion.usage.completionTokens,
      totalTokens: completion.usage.totalTokens,
    });
  },
});
```

### 8.3 フロントエンド実装パターン

#### 基本パターン

```typescript
// components/Chat.tsx
'use client';

import { useChat } from '@ai-sdk/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
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

#### ツール呼び出し表示

```typescript
import { useChat } from '@ai-sdk/react';

export function ChatWithTools() {
  const { messages } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
          
          {/* ツール呼び出し表示 */}
          {m.toolInvocations?.map(invocation => (
            <div key={invocation.toolCallId}>
              {invocation.state === 'call' && (
                <div>Calling {invocation.toolName}...</div>
              )}
              {invocation.state === 'result' && (
                <div>
                  Result: {JSON.stringify(invocation.result)}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 8.4 既存コードからの移行手順

#### Step 1: 型定義の対応

```typescript
// lib/llm/types.ts
// 既存の型をAI SDKの型にマッピング

import type { Message } from 'ai';

// 既存コードとの互換性のためのエイリアス
export type LLMMessage = Message;

// 必要に応じて拡張
export interface ExtendedMessage extends Message {
  reasoningSteps?: ReasoningStep[];
}
```

#### Step 2: API Routeの移行

```typescript
// app/api/llm/stream/route.ts
// 既存実装を残しつつ、AI SDK版を追加

import { streamText } from 'ai';
import { legacyStreamHandler } from './legacy';
import { aiSdkStreamHandler } from './ai-sdk';

const USE_AI_SDK = process.env.USE_AI_SDK === 'true';

export async function POST(req: Request) {
  if (USE_AI_SDK) {
    return aiSdkStreamHandler(req);
  }
  return legacyStreamHandler(req);
}
```

#### Step 3: フロントエンドの移行

```typescript
// components/ui/FeatureChat.tsx
// 既存コンポーネントをラップして段階的に移行

import { LegacyChat } from './LegacyChat';
import { AiSdkChat } from './AiSdkChat';

const USE_AI_SDK = process.env.NEXT_PUBLIC_USE_AI_SDK === 'true';

export function FeatureChat(props: FeatureChatProps) {
  if (USE_AI_SDK) {
    return <AiSdkChat {...props} />;
  }
  return <LegacyChat {...props} />;
}
```

---

## 9. 検証・テスト計画

### 9.1 検証項目一覧

| 検証項目 | 検証方法 | 合格基準 |
|---------|---------|---------|
| ストリーミング動作 | 手動テスト | 文字が順次表示される、遅延なし |
| エラーハンドリング | 手動テスト（APIキー無効化等） | 適切なエラーメッセージが表示 |
| ツール呼び出し | 手動テスト | ツールが正しく実行され結果が表示 |
| パフォーマンス | 計測（React DevTools等） | 既存実装と同等以上のパフォーマンス |
| メモリリーク | 計測（Chrome DevTools） | 長時間使用でもメモリ増加なし |
| レスポンシブ | 手動テスト（複数画面サイズ） | 全画面サイズで正常動作 |

### 9.2 自動テスト戦略

#### 単体テスト

```typescript
// __tests__/api/chat.test.ts
import { POST } from '@/app/api/chat/route';

describe('Chat API', () => {
  it('should return streaming response', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    });

    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
  });
});
```

#### E2Eテスト

```typescript
// tests/chat.spec.ts
import { test, expect } from '@playwright/test';

test('chat streaming works', async ({ page }) => {
  await page.goto('/chat');
  
  await page.fill('[data-testid="chat-input"]', 'Hello');
  await page.click('[data-testid="send-button"]');
  
  // ストリーミングが開始されることを確認
  await expect(page.locator('[data-testid="message-content"]')).toContainText('Hello');
});
```

### 9.3 パフォーマンス比較

```typescript
// 計測スクリプト
async function measurePerformance() {
  const start = performance.now();
  
  // AI SDK版の呼び出し
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
  
  const reader = response.body?.getReader();
  let content = '';
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    content += new TextDecoder().decode(value);
  }
  
  const end = performance.now();
  
  return {
    totalTime: end - start,
    contentLength: content.length,
    // その他のメトリクス
  };
}
```

---

## 10. リスクと対策

### 10.1 技術的リスク

| リスク | 内容 | 対策 |
|--------|------|------|
| レスポンス形式の互換性 | AI SDKのSSE形式と現状の形式が異なる | Phase 0で形式比較、必要に応じて変換層を設ける |
| カスタム機能の喪失 | 独自の`reasoningSteps`パース等が不要になる | Phase 1で機能的同等性を検証、必要なら拡張 |
| パフォーマンス劣化 | 抽象化レイヤーによるオーバーヘッド | Phase 1で計測、問題あれば最適化検討 |
| 破壊的変更 | AI SDKのメジャーアップデート | 安定版（v4）を使用、段階的アップデート |

### 10.2 運用リスク

| リスク | 内容 | 対策 |
|--------|------|------|
| 学習コスト | チーム全体の習得時間 | ドキュメント整備、ペアプログラミング、技術検証共有 |
| 移行中断 | 他優先タスクによる中断 | 段階的アプローチで影響最小化、各Phaseを独立完了可能に |
| 品質低下 | 移行によるバグ混入 | 十分なテスト、段階的リリース、ロールバック計画 |
| 知識の散逸 | 独自実装の知識が失われる | 移行記録を残し、設計判断の文書化 |

---

## 11. トラブルシューティングガイド

### 11.1 よくある問題と解決策

#### 問題1: ストリーミングが開始されない

**症状**: API呼び出し後、レスポンスが返ってこない

**確認事項**:
1. APIキーが正しく設定されているか
2. モデル名が正しいか
3. プロバイダーのbaseURLが正しいか

**解決策**:
```typescript
// デバッグ用ログを追加
const result = streamText({
  model: grok('grok-4-1-fast'),
  messages,
  onError: (error) => {
    console.error('Stream error:', error);
  },
});
```

#### 問題2: ツール呼び出しが動作しない

**症状**: ツールが定義されているが呼び出されない

**確認事項**:
1. ツールの`description`が適切か
2. パラメータのスキーマが正しいか
3. モデルがツール呼び出しに対応しているか

**解決策**:
```typescript
// ツール定義の確認
const toolDefinition = tool({
  description: '明確で具体的な説明を記載',
  parameters: z.object({
    param: z.string().describe('パラメータの説明'),
  }),
  execute: async (args) => {
    console.log('Tool called with:', args); // デバッグログ
    // ...
  },
});
```

#### 問題3: 型エラーが発生する

**症状**: TypeScriptの型エラーが多数発生

**確認事項**:
1. AI SDKのバージョンが正しいか
2. 型定義ファイルが正しくインポートされているか

**解決策**:
```typescript
// 型定義の明示的なインポート
import type { Message, StreamTextResult } from 'ai';

// 必要に応じて型アサーション（一時的な対応のみ）
const messages = rawMessages as Message[];
```

### 11.2 デバッグ手法

#### バックエンドデバッグ

```typescript
// ミドルウェアでのログ出力
const result = streamText({
  model: grok('grok-4-1-fast'),
  messages,
  onChunk: (chunk) => {
    console.log('Chunk:', chunk); // 各チャンクをログ出力
  },
  onFinish: (completion) => {
    console.log('Completion:', completion); // 完了時の情報
  },
});
```

#### フロントエンドデバッグ

```typescript
// useChatのデバッグ
const { messages, error, data } = useChat({
  api: '/api/chat',
  onError: (error) => {
    console.error('Chat error:', error);
  },
  onFinish: (message) => {
    console.log('Finished:', message);
  },
});

// 状態の監視
useEffect(() => {
  console.log('Messages updated:', messages);
}, [messages]);
```

### 11.3 サポート・問い合わせ先

| リソース | URL | 用途 |
|---------|-----|------|
| 公式ドキュメント | https://ai-sdk.dev/docs | 基本的な使用方法 |
| GitHub Issues | https://github.com/vercel/ai/issues | バグ報告、機能要望 |
| Discord | https://discord.gg/vercel | コミュニティサポート |
| 社内Slack | #dev-ai-sdk | 社内での知見共有 |

---

## 12. 参考情報

### 12.1 公式ドキュメント
- [AI SDK 公式ドキュメント](https://ai-sdk.dev/docs/introduction)
- [AI SDK Core ドキュメント](https://sdk.vercel.ai/docs/ai-sdk-core/overview)
- [AI SDK UI ドキュメント](https://sdk.vercel.ai/docs/ai-sdk-ui/overview)
- [Vercel AI SDK ブログ](https://vercel.com/blog/ship-ai-2025-recap)

### 12.2 関連ドキュメント
- [LLM統合仕様](../../specs/api-integration/llm-integration.md)
- [LLMフレームワーク比較](../../specs/api-integration/llm-framework-comparison.md)

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
| 2026-02-21 | AI開発エージェント | 初版作成 |
| 2026-02-21 | AI開発エージェント | 現状実装分析を追加、移行フェーズを具体化 |
| 2026-02-21 | AI開発エージェント | 安全な移行戦略・実装手順・テスト計画・トラブルシューティングを追加 |
