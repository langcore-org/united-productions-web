# UPエージェント

United Productions 制作支援統合プラットフォーム

## 概要

UPエージェントは、テレビ制作現場の業務効率化を目的としたAI統合アプリケーションです。複数のLLM（大規模言語モデル）を活用し、議事録作成、書き起こし整形、リサーチ・考査、ロケスケ管理などの機能を提供します。

## 機能一覧

| メニュー | PJ | 対象業務 | 主要機能 | デフォルトLLM |
|---------|-----|---------|---------|-------------|
| 📝 議事録・文字起こし | A | No.6 | Zoom文字起こしテキスト貼り付け→AI整形 | Gemini 2.5 Flash-Lite |
| 🎬 起こし・NA原稿 | B | No.14 | Premiere Pro書き起こしテキスト→決まったフォーマットに整形 | Gemini 2.5 Flash-Lite |
| 🔍 リサーチ・考査 | C | No.1・2・20 | LLM連携で人探し/ロケ地/エビデンス | Grok 4.1 Fast / Perplexity Sonar |
| 📅 ロケスケ管理 | D | No.9 | マスター編集→各種表自動生成 | Gemini 2.5 Flash-Lite |

## 技術スタック

| 層 | 技術 |
|---|------|
| フロントエンド | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| UIコンポーネント | shadcn/ui |
| バックエンド | Next.js API Routes（Vercel Serverless）|
| データベース | Neon PostgreSQL + Prisma |
| 認証 | NextAuth.js（Google Workspace SSO）|
| キャッシュ | Upstash Redis（レート制限用）|

## 対応LLMプロバイダー

- **Google AI Studio** (Gemini 2.5 Flash-Lite / Gemini 3.0 Flash)
- **xAI** (Grok 4.1 Fast / Grok 4)
- **OpenAI** (GPT-4o-mini / GPT-5)
- **Anthropic** (Claude 4.5 Sonnet / Claude Opus 4.6)
- **Perplexity** (Sonar / Sonar Pro)

## 開発環境のセットアップ

### 必要条件

- Node.js 20+
- pnpm または npm

### インストール

```bash
# 依存関係のインストール
cd my-app
pnpm install

# 環境変数の設定
cp .env.template .env.local
# .env.local を編集して必要なAPIキーを設定

# データベースのセットアップ
pnpm prisma migrate dev

# 開発サーバーの起動
pnpm dev
```

### 必要な環境変数

```bash
# 認証（Google Workspace SSO）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# データベース（Neon）
DATABASE_URL=postgresql://...

# キャッシュ・レート制限（Upstash）
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# LLM API（Google AI Studio無料枠から開始）
GEMINI_API_KEY=

# 有料API（必要に応じて）
XAI_API_KEY=
PERPLEXITY_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## プロジェクト構成

```
/home/koyomaru/agent1/
├── docs/                    # ドキュメント群
│   ├── archive/             # アーカイブ資料
│   ├── assets/              # 参考資料、画像
│   │   └── excels_and_words/
│   │       ├── 構成資料/
│   │       ├── 議事録/
│   │       └── リサーチ資料/
│   │           ├── 情報リサーチ/
│   │           ├── 人物リサーチ/
│   │           ├── 場所リサーチ/
│   │           └── その他リサーチ/
│   ├── initial_dev/         # 開発計画書・設計書
│   └── README.md
├── my-app/                  # Next.jsアプリケーション（エントリポイント）
│   ├── app/                 # App Router（ルート設定）
│   ├── lib/                 # アプリ固有ユーティリティ
│   ├── public/              # 静的ファイル
│   ├── package.json
│   └── next.config.ts
├── prisma/                  # Prismaスキーマ・マイグレーション
│   └── migrations/
├── src/                     # メインソースコード
│   ├── app/                 # App Router（ページ・API）
│   │   ├── api/             # API Routes
│   │   │   ├── auth/        # 認証関連API
│   │   │   ├── chat/        # チャット関連API
│   │   │   └── drive/       # Google Drive連携API
│   │   └── ...              # ページコンポーネント
│   ├── components/          # Reactコンポーネント
│   │   ├── chat/            # チャット関連コンポーネント
│   │   ├── drive/           # Drive連携コンポーネント
│   │   └── ui/              # UI共通コンポーネント（shadcn/ui）
│   ├── hooks/               # カスタムフック
│   ├── lib/                 # ユーティリティ・LLMクライアント
│   │   ├── google/          # Google AI Studio連携
│   │   ├── grok/            # xAI Grok連携
│   │   └── perplexity/      # Perplexity API連携
│   ├── prompts/             # LLMプロンプト定義
│   ├── types/               # TypeScript型定義
│   └── utils/               # 共通ユーティリティ関数
├── tests/                   # テスト
│   ├── unit/                # ユニットテスト
│   ├── integration/         # 統合テスト
│   └── e2e/                 # E2Eテスト
└── .claude/                 # Claude設定・メモリ
```

## 開発フェーズ

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 0 | Day 1-2 | 基盤構築（UI分析、DB設計、認証、DevOps）|
| Phase 1 | Day 3-5 | コア機能（PJ-C リサーチ・考査）|
| Phase 2 | Day 6-8 | 周辺機能（PJ-A/B/D）|
| Phase 3 | Day 9-10 | 統合・最適化・テスト |

## コスト見積もり

### インフラ（全て無料枠）

| サービス | プラン | 月額 |
|---------|------|------|
| Vercel | Hobby | $0 |
| Neon PostgreSQL | Free | $0 |
| Upstash Redis | Free | $0 |
| Google Drive API | 無料 | $0 |

### LLM API

| 用途 | LLM | 月額コスト |
|------|-----|----------|
| PJ-A/B/D（テキスト整形） | Gemini（Google AI Studio無料枠） | **$0** |
| PJ-C 人探し | Grok 4.1 Fast（$25無料クレジット） | **$0** |
| PJ-C エビデンス | Perplexity Sonar | $0.50-1.00 |
| **合計** | | **$0〜1/月** |

## ドキュメント

詳細な仕様書は [`docs/README.md`](./docs/README.md) を参照してください。

- [開発計画書](./docs/initial_dev/initial_dev_plan.md)
- [技術設計レビュー](./docs/archive/technical-review-20260215.md)
- [LLM統合設計](./docs/initial_dev/llm-integration.md)

## ライセンス

Private - United Productions
