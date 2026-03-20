# AI Hub ガイド一覧

> **開発・運用に関する各種ガイドドキュメント**
> 
> **最終更新**: 2026-03-20 14:35

---

## 🚀 セットアップガイド

| ドキュメント | 説明 |
|-------------|------|
| [setup/database-cache.md](./setup/database-cache.md) | Supabase（PostgreSQL + Auth）の設定手順 |
| [setup/google-oauth-setup.md](./setup/google-oauth-setup.md) | Google OAuth（Supabase Auth連携）設定ガイド |
| [setup/vercel-authentication.md](./setup/vercel-authentication.md) | Vercelプレビュー環境での認証設定 |

---

## 🛠 開発ガイド

| ドキュメント | 説明 |
|-------------|------|
| [development/code-review-checklist.md](./development/code-review-checklist.md) | プルリクエスト時のレビュー基準 |
| [development/naming-conventions.md](./development/naming-conventions.md) | ファイル、変数、型の命名標準 |
| [development/workflow-standards.md](./development/workflow-standards.md) | 開発作業の標準的な進め方と規約 |

---

## 🧪 テスト・品質

| ドキュメント | 説明 |
|-------------|------|
| [testing-e2e.md](./testing-e2e.md) | Playwrightを使用したE2Eテストガイド |

---

## 📊 データ管理

| ドキュメント | 説明 |
|-------------|------|
| [data-quality/tv-program-data-guide.md](./data-quality/tv-program-data-guide.md) | TV番組放送回データの管理ガイド |
| [research-tools-guide.md](./research-tools-guide.md) | SNSリサーチツール・API調査ガイド |

---

## 🎨 UI/UX

| ドキュメント | 説明 |
|-------------|------|
| [ui-ux-guidelines.md](./ui-ux-guidelines.md) | AI HubのUI/UXガイドライン |

---

## 🔧 トラブルシューティング

| ドキュメント | 説明 |
|-------------|------|
| [troubleshooting.md](./troubleshooting.md) | 開発中のよくある問題と解決策 |

---

## 📚 関連ドキュメント

| 場所 | 説明 |
|------|------|
| [docs/INDEX.md](../INDEX.md) | 全ドキュメントのインデックス |
| [docs/README.md](../README.md) | ドキュメント入り口・全体構成 |
| [../specs/](../specs/) | 技術仕様書（システムアーキテクチャ、API仕様など） |
| [../user-docs/](../user-docs/) | ユーザードキュメント（非技術者向け） |
| [../lessons/](../lessons/) | 過去の学びと推奨事項（技術選定前に必読） |
| [../plans/](../plans/) | 進行中の計画・現在のタスク |
| [../backlog/](../backlog/) | 保留タスク・調査項目 |
| [../archive/](../archive/) | アーカイブ（過去資料） |
| [../../AGENTS.md](../../AGENTS.md) | エージェント行動指針 |

---

## 技術スタック概要

| 項目 | 内容 |
|------|------|
| **フレームワーク** | Next.js 16 (App Router) |
| **認証** | Supabase Auth (Google OAuth + Email/Password) |
| **データベース** | PostgreSQL (Supabase) |
| **キャッシュ** | Upstash Redis |
| **デプロイ** | Vercel |
| **LLM** | xAI (Grok) 直接API呼び出し |

---

## クイックリファレンス

### よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# 型チェック
npx tsc --noEmit

# Lint実行
npm run lint

# テスト実行
npm run test

# E2Eテスト
npm run test:e2e

# Supabase CLI
npx supabase status
```

### 環境変数（.env.local）

```env
# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# LLM API
XAI_API_KEY=your-xai-key
```

---

**最終更新**: 2026-03-20 14:35
