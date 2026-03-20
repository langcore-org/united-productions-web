# AI Hub - United Productions

> **最終更新**: 2026-03-20

制作支援統合プラットフォーム。テレビ制作業務をAIで効率化するための統合ツール群です。

## 概要

AI Hubは、テレビ制作現場の様々な業務をAIで支援する統合プラットフォームです。議事録作成、リサーチ・考査、新企画立案などの機能を提供します。

## 技術スタック

### コア

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript 5.9 |
| スタイリング | Tailwind CSS 4 |
| UIコンポーネント | shadcn/ui |
| 認証 | Supabase Auth (Google OAuth + Email/Password) |
| データベース | PostgreSQL (Supabase) |
| キャッシュ | Upstash Redis |
| LLM統合 | **xAI直接呼び出し**（LangChainは将来のGemini追加用に保持） |
| デプロイ | Vercel |

### 開発ツール

| カテゴリ | ツール | 用途 |
|---------|--------|------|
| **Lint/Format** | [Biome](https://biomejs.dev/) | 高速なLint+Format統合 |
| **Git Hooks** | [Lefthook](https://github.com/evilmartians/lefthook) | 並列実行で高速なpre-commit |
| **未使用コード検出** | [Knip](https://knip.dev/) | デッドコード検出・削除 |
| **依存関係管理** | [Renovate](https://docs.renovatebot.com/) | 自動依存更新・セキュリティパッチ |
| **バンドル分析** | [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) | バンドルサイズ可視化 |

## 開発状況

| Wave | 内容 | 状態 |
|------|------|------|
| Wave 1 | 基盤構築（認証、DB、LLM Factory） | ✅ 完了 |
| Wave 2 | UI/LLM連携（shadcn/ui、各LLMクライアント） | ✅ 完了 |
| Wave 3 | 機能実装（PJ-A/B/C/D、Drive連携） | ✅ 完了 |
| Wave 4 | サイドバーナビゲーション・FeatureChat実装 | ✅ 完了 |
| Wave 5 | 統合・最適化（キャッシュ、テスト、デプロイ） | ✅ 完了 |
| Wave 6 | 本番リリース準備・最終調整 | 🔄 進行中 |

## 機能一覧

### サイドバーナビゲーション

```
├── チャット             → /chat
├── リサーチ（折りたたみメニュー）
│   ├── 出演者リサーチ → /research/cast
│   └── エビデンスリサーチ → /research/evidence
├── 議事録作成         → /minutes
├── 新企画立案         → /proposal
└── 番組設定           → /settings/program
```

### 実装済み機能

| 機能 | パス | 説明 |
|------|------|------|
| **チャット** | `/chat` | 一般的なAIチャット。番組情報を参照した自然な会話が可能 |
| **出演者リサーチ** | `/research/cast` | 企画に適した出演者候補を提案。プロフィール、出演実績、相性分析を含む |
| **エビデンスリサーチ** | `/research/evidence` | 情報の真偽を検証。ファクトチェック・一次情報源を特定 |
| **議事録作成** | `/minutes` | 文字起こしから構造化された議事録を作成。TODO・決定事項を抽出 |
| **新企画立案** | `/proposal` | 番組情報と過去企画を基に新しい企画案を提案 |
| **番組設定** | `/settings/program` | 番組情報・過去企画を管理。新企画立案で使用 |

> **将来実装予定**: 文字起こし変換、NA原稿作成、場所リサーチ、情報リサーチ

## FeatureChat コンポーネント

各機能ページで共通して使用するチャットUIコンポーネントです。

```typescript
interface FeatureChatProps {
  featureId: string;          // 機能識別子
  chatId?: string;            // チャットセッションID（指定なしで新規チャット）
  onChatCreated?: (chatId: string) => void; // 新規チャット作成時のコールバック
  title: string;              // ページタイトル
  systemPrompt: string;       // システムプロンプト
  placeholder: string;        // 入力欄プレースホルダー
  inputLabel?: string;        // 入力エリアラベル
  outputFormat?: "markdown" | "plaintext";
}
```

**特徴:**
- ストリーミングレスポンス対応（SSE）
- 会話履歴の自動保存（Supabase）
- チャットセッション管理（chatIdベースのCRUD）
- 新規チャット時の自動タイトル生成（Grok）
- plaintextモード時のWordコピー機能
- 各機能別のシステムプロンプト切り替え

## ディレクトリ構成

```
.
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # 認証必須ページ
│   │   ├── chat/
│   │   │   └── page.tsx          # 一般チャット
│   │   ├── research/
│   │   │   ├── cast/page.tsx     # 出演者リサーチ
│   │   │   └── evidence/page.tsx # エビデンスリサーチ
│   │   ├── minutes/page.tsx      # 議事録作成
│   │   ├── proposal/page.tsx     # 新企画立案
│   │   └── settings/
│   │       └── program/page.tsx  # 番組設定
│   ├── api/
│   │   ├── chat/
│   │   │   └── feature/route.ts  # 機能別チャットAPI
│   │   ├── llm/                  # LLM関連API
│   │   └── settings/
│   │       └── program/route.ts  # 番組設定API
│   └── auth/                     # 認証ページ（Supabase Auth）
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx           # サイドバー（折りたたみ対応）
│   └── ui/
│       └── FeatureChat.tsx       # 共通チャットUI
├── lib/
│   ├── prompts/                  # プロンプト管理
│   │   ├── constants/            # プロンプト定数
│   │   ├── db/                   # DB操作用（CRUD、バージョン管理）
│   │   ├── archive/              # アーカイブされたプロンプト
│   │   ├── index.ts              # エクスポート
│   │   └── system-prompt.ts      # システムプロンプト構築
│   ├── llm/                      # LLM統合
│   │   ├── clients/              # LLMクライアント（xAI Grok等）
│   │   ├── memory/               # 会話メモリ管理
│   │   ├── config.ts             # LLM設定
│   │   ├── factory.ts            # LLMクライアントファクトリ
│   │   └── types.ts              # 型定義
│   └── knowledge/                # 番組情報・ナレッジベース
├── supabase/
│   └── migrations/               # Supabaseマイグレーション
└── docs/                         # ドキュメント
    ├── specs/                    # 技術仕様
    ├── guides/                   # 開発ガイド
    ├── lessons/                  # 学びの記録
    └── prompts/                  # プロンプト定義（DB反映用）
```

## 環境構築

### 前提条件
- Node.js 20以上
- npm 10以上

### セットアップ手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd teddy
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
```bash
cp .env.example .env.local
# .env.localを編集して必要な値を設定
```

4. **Supabaseのセットアップ**
```bash
# Supabase CLIがインストールされている場合
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

詳細は [Supabaseセットアップガイド](./docs/guides/setup/database-cache.md) を参照

5. **開発サーバーの起動**
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で利用可能になります。

## 必要な環境変数

| 変数名 | 説明 | 取得先 |
|-------|------|--------|
| `NEXT_PUBLIC_APP_URL` | アプリケーションURL | 開発時: `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | [Supabase](https://supabase.com/) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | [Supabase](https://supabase.com/) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー | [Supabase](https://supabase.com/) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | [Upstash](https://upstash.com/) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis トークン | [Upstash](https://upstash.com/) |
| `XAI_API_KEY` | xAI APIキー（必須） | [xAI](https://x.ai/api) |
| `PERPLEXITY_API_KEY` | Perplexity APIキー（エビデンス検索用） | [Perplexity](https://www.perplexity.ai/settings/api) |
| `GEMINI_API_KEY` | Google AI Studio APIキー（将来連携予定） | [AI Studio](https://aistudio.google.com/app/apikey) |

> **注**: `NEXTAUTH_SECRET` と `NEXTAUTH_URL` は Supabase Auth 移行により不要になりました。

詳細は [.env.example](./.env.example) を参照してください。

## 利用可能なLLMモデル

| モデル | プロバイダー | 用途 | 備考 |
|-------|------------|------|------|
| Grok 4.1 Fast | xAI | デフォルト・高速タスク | 有料API |
| Grok 4 | xAI | 最高品質 | 有料API |
| Perplexity Sonar | Perplexity | エビデンス検索 | 有料API |
| Perplexity Sonar Pro | Perplexity | 高品質検索 | 有料API |

> **注**: Geminiは将来の追加用に準備中（LangChain経由での統合予定）

## スクリプト

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# Lint/Format（Biome）
npm run lint             # Lintチェック
npm run lint:fix         # Lint自動修正
npm run format           # フォーマット

# 未使用コード検出（Knip）
npm run knip             # 未使用コード検出
npm run knip:check       # CI用（エラーで終了しない）

# バンドル分析
npm run analyze          # バンドルサイズ分析

# テスト
npm run test             # 単体テスト（Vitest）
npm run test:e2e         # E2Eテスト（Playwright）

# プロンプト管理
node scripts/prompts/update-from-doc.mjs <KEY> "理由"  # プロンプトをDBに反映

# Supabase関連
supabase db push         # マイグレーション実行
supabase db reset        # DBリセット（開発用）
```

## ドキュメント

### 概要・設計

- [ドキュメントガイド](./docs/README.md)
- [アーキテクチャ設計](./docs/specs/architecture/system-architecture.md)
- [API仕様書](./docs/specs/api-integration/api-specification.md)
- [データベーススキーマ](./docs/specs/api-integration/database-schema.md)
- [LLM統合概要](./docs/specs/api-integration/llm-integration-overview.md)
- [システムプロンプト管理](./docs/specs/api-integration/system-prompt-management.md)

### 開発・運用

- [開発ガイド](./docs/guides/development/workflow-standards.md)
- [デプロイ手順](./docs/specs/operations/deployment-guide.md)
- [テスト戦略](./docs/specs/operations/testing-strategy.md)
- [エラーハンドリング](./docs/specs/operations/error-handling.md)

### 学びの記録

- [LangChain移行の教訓](./docs/lessons/2026-02-24-langchain-premature-abstraction.md)
- [xAI直接実装の教訓](./docs/lessons/2026-03-20-xai-direct-implementation-lesson.md)
- [Supabase移行の教訓](./docs/lessons/2026-03-20-supabase-migration-lesson.md)

## ライセンス

Private - United Productions
