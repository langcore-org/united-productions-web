# AI Hub - United Productions

制作支援統合プラットフォーム。テレビ制作業務をAIで効率化するための統合ツール群です。

## 概要

AI Hubは、テレビ制作現場の様々な業務をAIで支援する統合プラットフォームです。議事録作成、NA原稿生成、リサーチ・考査、ロケスケジュール管理などの機能を提供します。

## 技術スタック

### コア

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript 5.9 |
| スタイリング | Tailwind CSS 4 |
| UIコンポーネント | shadcn/ui |
| 認証 | NextAuth.js v4 + Google OAuth |
| データベース | PostgreSQL (Neon) + Prisma 5 |
| キャッシュ | Upstash Redis |
| LLM統合 | LangChain + xAI Grok |
| デプロイ | Vercel |

### 開発ツール（2026-02-23導入）

| カテゴリ | ツール | 用途 |
|---------|--------|------|
| **Lint/Format** | [Biome](https://biomejs.dev/) | 35倍高速なLint+Format統合 |
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
| Wave 5 | 統合・最適化（キャッシュ、テスト、デプロイ） | 🔄 進行中 |

## 機能一覧

### サイドバーナビゲーション

```
├── リサーチ（折りたたみメニュー）
│   ├── 出演者リサーチ → /research/cast
│   └── エビデンスリサーチ → /research/evidence
├── 議事録作成         → /minutes
├── 新企画立案         → /proposal
├── 文字起こし（折りたたみメニュー）
│   ├── フォーマット変換 → /transcript
│   └── NA原稿作成     → /transcript/na
└── 番組設定           → /settings/program
```

### リサーチ機能 (PJ-C)

| 機能 | パス | 説明 |
|------|------|------|
| **出演者リサーチ** | `/research/cast` | 企画に適した出演者候補を提案。プロフィール、出演実績、相性分析を含む |
| **エビデンスリサーチ** | `/research/evidence` | 情報の真偽を検証。ファクトチェック・一次情報源を特定 |

> **注記**: 場所リサーチ・情報リサーチは4月以降に実装予定

### 議事録・文字起こし (PJ-A/PJ-B)

| 機能 | パス | 説明 |
|------|------|------|
| **議事録作成** | `/minutes` | 文字起こしから構造化された議事録を作成。TODO・決定事項を抽出 |
| **新企画立案** | `/proposal` | 番組情報と過去企画を基に新しい企画案を提案 |
| **文字起こし変換** | `/transcript` | テキスト整形・フォーマット変換。フィラー除去、段落分け |
| **NA原稿作成** | `/transcript/na` | ナレーション原稿を作成。Wordコピー対応のプレーンテキスト出力 |

### 番組設定

| 機能 | パス | 説明 |
|------|------|------|
| **番組設定** | `/settings/program` | 番組情報・過去企画を管理。新企画立案で使用 |

### ロケスケ管理 (PJ-D)

- マスタースケジュールからの自動生成
- 演者別スケジュール・香盤表・車両表
- Markdown/CSVエクスポート

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
- 会話履歴の自動保存（Prisma）
- チャットセッション管理（chatIdベースのCRUD）
- 新規チャット時の自動タイトル生成（Grok）
- plaintextモード時のWordコピー機能
- 各機能別のシステムプロンプト切り替え

## ディレクトリ構成

```
.
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # 認証必須ページ
│   │   ├── research/
│   │   │   ├── cast/page.tsx     # 出演者リサーチ
│   │   │   └── evidence/page.tsx # エビデンスリサーチ
│   │   │   # 場所リサーチ・情報リサーチは4月以降実装予定
│   │   ├── minutes/page.tsx      # 議事録作成
│   │   ├── proposal/page.tsx     # 新企画立案
│   │   ├── transcript/
│   │   │   ├── page.tsx          # 文字起こし変換
│   │   │   └── na/page.tsx       # NA原稿作成
│   │   └── settings/
│   │       └── program/page.tsx  # 番組設定
│   ├── api/
│   │   ├── auth/                 # NextAuth.js認証
│   │   ├── chat/
│   │   │   └── feature/route.ts  # 機能別チャットAPI
│   │   ├── llm/                  # LLM関連API
│   │   └── settings/
│   │       └── program/route.ts  # 番組設定API
│   └── auth/                     # 認証ページ
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx           # サイドバー（折りたたみ対応）
│   └── ui/
│       └── FeatureChat.tsx       # 共通チャットUI
├── lib/
│   ├── prompts/                  # プロンプト定数
│   │   ├── research-cast.ts
│   │   ├── research-evidence.ts
│   │   # research-location.ts, research-info.ts は4月以降実装予定
│   │   ├── minutes.ts
│   │   ├── proposal.ts
│   │   ├── transcript.ts
│   │   └── na-script.ts
│   └── llm/                      # LLM統合
├── prisma/
│   └── schema.prisma             # Prismaスキーマ
└── docs/                         # ドキュメント
    ├── ARCHITECTURE.md           # アーキテクチャ設計
    ├── API.md                    # API仕様書
    └── IMPROVEMENT_PLAN.md       # 改善プラン
```

## 環境構築

### 前提条件
- Node.js 20以上
- npm 10以上

### セットアップ手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd agent1
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

4. **データベースのセットアップ**
```bash
# Prisma Clientの生成
npx prisma generate

# データベースマイグレーション
npx prisma migrate dev
```

5. **開発サーバーの起動**
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で利用可能になります。

## 必要な環境変数

| 変数名 | 説明 | 取得先 |
|-------|------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `NEXTAUTH_SECRET` | NextAuth.js 秘密鍵 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | アプリケーションURL | 開発時: `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL接続URL | [Neon](https://neon.tech/) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | [Upstash](https://upstash.com/) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis トークン | [Upstash](https://upstash.com/) |
| `GEMINI_API_KEY` | Google AI Studio APIキー | [AI Studio](https://aistudio.google.com/app/apikey) |
| `XAI_API_KEY` | xAI APIキー | [xAI](https://x.ai/api) |
| `PERPLEXITY_API_KEY` | Perplexity APIキー | [Perplexity](https://www.perplexity.ai/settings/api) |

詳細は [.env.example](./.env.example) を参照してください。

## 利用可能なLLMモデル

| モデル | プロバイダー | 用途 | 無料枠 |
|-------|------------|------|--------|
| Gemini 2.5 Flash-Lite | Google | デフォルト・軽量タスク | 30 RPM / 1,500 RPD |
| Gemini 3.0 Flash | Google | 高品質タスク | 30 RPM / 1,500 RPD |
| Grok 4.1 Fast | xAI | X検索・人探し | 有料API |
| Grok 4 | xAI | 最高品質 | 有料API |
| Perplexity Sonar | Perplexity | エビデンス検索 | 有料API |
| Perplexity Sonar Pro | Perplexity | 高品質検索 | 有料API |

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

# Prisma関連
npx prisma generate      # Client生成
npx prisma migrate dev   # マイグレーション
npx prisma studio        # DB GUI
```

## ドキュメント

### 概要・設計

- [ドキュメントガイド](./docs/README.md)
- [アーキテクチャ設計](./docs/specs/architecture/system-architecture.md)
- [API仕様書](./docs/specs/api-integration/api-specification.md)
- [データベーススキーマ](./docs/specs/api-integration/database-schema.md)

### 開発・運用

- [開発ガイド](./docs/guides/development/workflow-standards.md)
- [デプロイ手順](./docs/specs/operations/deployment-guide.md)
- [テスト戦略](./docs/specs/operations/testing-strategy.md)
- [**フレームワーク・ツール導入検討書**](./docs/plans/current/framework-tool-evaluation.md) ⭐ 新規

## ライセンス

Private - United Productions
