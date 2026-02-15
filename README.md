# AI Hub - United Productions

制作支援統合プラットフォーム。テレビ制作業務をAIで効率化するための統合ツール群です。

## 概要

AI Hubは、テレビ制作現場の様々な業務をAIで支援する統合プラットフォームです。議事録作成、NA原稿生成、リサーチ・考査、ロケスケジュール管理などの機能を提供します。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS 4 |
| UIコンポーネント | shadcn/ui |
| 認証 | NextAuth.js v4 + Google OAuth |
| データベース | PostgreSQL (Neon) + Prisma |
| キャッシュ | Upstash Redis |
| LLM統合 | Google Gemini, xAI Grok, Perplexity |
| デプロイ | Vercel |

## 機能一覧

### PJ-A: 議事録・文字起こし
- Zoom文字起こしテキストをAIで整形
- 会議用・面談用テンプレート
- 自動要約・TODO抽出

### PJ-B: 起こし・NA原稿
- Premiere Pro書き起こしテキストからNA原稿生成
- 話者分離・タイムコード整理

### PJ-C: リサーチ・考査
- **人探しエージェント**: X検索を活用した人物特定 (Grok)
- **エビデンス確認エージェント**: 事実検証・ソース付き回答 (Perplexity)
- **ロケ地探しエージェント**: 撮影場所の提案・検索 (Perplexity)

### PJ-D: ロケスケ管理
- マスタースケジュールからの自動生成
- 演者別スケジュール・香盤表・車両表
- Markdown/CSVエクスポート

## ディレクトリ構成

```
.
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # NextAuth.js認証
│   │   ├── llm/           # LLM関連API
│   │   ├── meeting-notes/ # 議事録API
│   │   ├── research/      # リサーチAPI
│   │   ├── schedules/     # スケジュールAPI
│   │   └── transcripts/   # 文字起こしAPI
│   ├── auth/              # 認証ページ
│   ├── meeting-notes/     # 議事録ページ
│   ├── research/          # リサーチページ
│   ├── schedules/         # スケジュールページ
│   ├── transcripts/       # 文字起こしページ
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ダッシュボード
├── components/            # Reactコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   ├── providers/        # プロバイダー
│   ├── research/         # リサーチ関連
│   └── ui/               # UIコンポーネント
├── lib/                   # ユーティリティ・ライブラリ
│   ├── llm/              # LLM統合
│   │   ├── clients/      # 各LLMクライアント
│   │   ├── cache.ts      # LLMレスポンスキャッシュ
│   │   ├── config.ts     # LLM設定・価格情報
│   │   ├── factory.ts    # LLMクライアントFactory
│   │   └── types.ts      # LLM型定義
│   ├── auth-options.ts   # NextAuth設定
│   ├── prisma.ts         # Prismaクライアント
│   ├── rate-limit.ts     # レート制限
│   └── utils.ts          # ユーティリティ
├── prompts/               # LLMプロンプト
│   ├── meeting-format.ts # 議事録整形プロンプト
│   ├── schedule-generate.ts # スケジュール生成プロンプト
│   └── transcript-format.ts # 文字起こし整形プロンプト
├── prisma/                # Prismaスキーマ・マイグレーション
├── types/                 # グローバル型定義
└── docs/                  # ドキュメント
    ├── ARCHITECTURE.md   # アーキテクチャ設計
    ├── API.md            # API仕様書
    └── DEPLOYMENT.md     # デプロイ手順
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

# Lint実行
npm run lint

# Prisma関連
npx prisma generate      # Client生成
npx prisma migrate dev   # マイグレーション
npx prisma studio        # DB GUI
```

## ドキュメント

- [アーキテクチャ設計](./docs/ARCHITECTURE.md)
- [API仕様書](./docs/API.md)
- [デプロイ手順](./docs/DEPLOYMENT.md)

## ライセンス

Private - United Productions
