# デプロイ手順

## 概要

AI HubはVercelプラットフォームへのデプロイを前提として設計されています。

## 進捗

| 項目 | 状態 | 備考 |
|------|------|------|
| 1. リポジトリの準備 | ✅ 済 | 2026年2月16日 |
| 2. Vercelプロジェクトの作成 | ✅ 済 | 2026年2月16日 |
| 3. 環境変数の設定 | ✅ 済 | .env.local → Vercel 反映済み |
| 4. データベースのセットアップ（Neon） | ⏳ 未開始 |  |
| 5. Google OAuth の設定（本番URI） | ⏳ 未開始 |  |
| 6. デプロイ実行 | ⏳ 未開始 |  |
| 7. デプロイ後の確認 | ⏳ 未開始 |  |

※ 状態が完了したら `✅ 済` を記入し、必要なら備考に日付やメモを追記してください。

## 前提条件

- Vercelアカウント
- GitHub/GitLab/Bitbucketアカウント（リポジトリ連携用）
- 各種外部サービスのアカウント
  - [Neon](https://neon.tech/) - PostgreSQLデータベース
  - [Upstash](https://upstash.com/) - Redisキャッシュ
  - [Google Cloud Console](https://console.cloud.google.com/) - OAuth認証
  - [Google AI Studio](https://aistudio.google.com/) - Gemini API
  - [xAI](https://x.ai/api) - Grok API（オプション）
  - [Perplexity](https://www.perplexity.ai/settings/api) - Perplexity API（オプション）

## デプロイ手順

### 1. リポジトリの準備 ✅

```bash
# Gitリポジトリの初期化（まだの場合）
git init
git add .
git commit -m "Initial commit"

# リモートリポジトリにプッシュ
git remote add origin <your-repository-url>
git push -u origin main
```

**状態**: ✅ 完了（2026年2月16日）
- ローカル開発環境で全機能実装完了
- Wave 1〜3の機能が全て実装済み

### 2. Vercelプロジェクトの作成

#### 方法A: Vercel Dashboardから作成

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. 「Add New Project」をクリック
3. リポジトリをインポート
4. プロジェクト名を設定（例: `ai-hub`）
5. Framework Preset: `Next.js`（自動検出）

#### 方法B: Vercel CLIを使用

```bash
# Vercel CLIのインストール
npm i -g vercel

# ログイン
vercel login

# プロジェクト作成
vercel
```

### 3. 環境変数の設定

ローカルで `.env.local` を用意したうえで、次のいずれかの方法で Vercel に反映します。

#### 方法A: Vercel Dashboard で手動設定

[Vercel Dashboard](https://vercel.com/dashboard) → プロジェクト → Settings → Environment Variables で、以下を追加します。

**必須環境変数**

| 変数名 | 値 | 取得方法 |
|-------|-----|---------|
| `NEXTAUTH_SECRET` | ランダム文字列 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 本番URL | Vercelドメイン（デプロイ後に更新） |
| `GOOGLE_CLIENT_ID` | Google OAuthクライアントID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuthクライアントシークレット | Google Cloud Console |
| `DATABASE_URL` | NeonデータベースURL | Neon Dashboard |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redisトークン | Upstash Console |
| `GEMINI_API_KEY` | Google AI Studio APIキー | AI Studio |

**オプション環境変数**

| 変数名 | 値 | 取得方法 |
|-------|-----|---------|
| `XAI_API_KEY` | xAI APIキー | xAI Console |
| `PERPLEXITY_API_KEY` | Perplexity APIキー | Perplexity Settings |

#### 方法B: ローカル .env.local から一括設定（Vercel CLI）

すでに `.env.local` に値が入っている場合、CLI で本番環境に一括追加できます。リポジトリルートでプロジェクトをリンクしたうえで実行してください。

```bash
# プロジェクトをリンク（未設定の場合）
vercel link

# .env.local の各行を Vercel の production に追加（コメント・空行は除く）
grep -v '^#' .env.local | grep -v '^$' | while IFS='=' read -r key value; do
  # 値の前後のクォートを削除
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  echo -n "$value" | vercel env add "$key" production
done
```

- **注意**: `NEXTAUTH_URL` は初回デプロイ後に本番URL（例: `https://your-app.vercel.app`）に更新してください。Dashboard または `vercel env rm NEXTAUTH_URL production && echo -n "https://your-app.vercel.app" | vercel env add NEXTAUTH_URL production` で変更できます。
- テンプレートは [.env.example](../.env.example) を参照。`cp .env.example .env.local` のあと、必要な値を編集してから上記を実行します。

### 4. データベースのセットアップ

#### Neon PostgreSQL

1. [Neon](https://neon.tech/) でプロジェクトを作成
2. データベース接続文字列をコピー
3. Vercelの環境変数 `DATABASE_URL` に設定
4. マイグレーション実行：

```bash
# ローカルからNeonにマイグレーション
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

またはVercelのBuild Commandに追加：
```json
{
  "scripts": {
    "vercel-build": "prisma migrate deploy && next build"
  }
}
```

### 5. Google OAuthの設定

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. 「OAuth 2.0 クライアント ID」を作成
3. 承認済みリダイレクトURIに以下を追加：
   - 開発: `http://localhost:3000/api/auth/callback/google`
   - 本番: `https://<your-domain>/api/auth/callback/google`
4. クライアントIDとシークレットをVercelの環境変数に設定

### 6. デプロイ実行

#### 自動デプロイ

Gitリポジトリにプッシュすると自動的にデプロイされます：

```bash
git push origin main
```

#### 手動デプロイ

```bash
vercel --prod
```

### 7. デプロイ後の確認

1. **アプリケーションURLにアクセス**
   - ダッシュボードが表示されることを確認

2. **認証フローの確認**
   - Googleログインが正常に動作することを確認

3. **API動作確認**
   ```bash
   curl -X POST https://<your-domain>/api/meeting-notes \
     -H "Content-Type: application/json" \
     -d '{"transcript": "テスト", "template": "meeting"}'
   ```

## 継続的デプロイメント

### ブランチ戦略

| ブランチ | 環境 | 自動デプロイ |
|---------|------|------------|
| `main` | 本番 | ✓ |
| `develop` | ステージング | ✓（設定時） |
| フィーチャーブランチ | プレビュー | ✓（PR時） |

### プレビューデプロイ

Pull Requestを作成すると、自動的にプレビュー環境が作成されます。

## トラブルシューティング

### デプロイ失敗: Next.jsセキュリティ脆弱性 (2026-02-16 解決済み)

**症状:** ビルドは成功するが、デプロイが以下のエラーで拒否される:
```
Error: Vulnerable version of Next.js detected, please update immediately.
```

**原因:** Next.js 15.1.6 に複数のセキュリティ脆弱性が存在し、Vercelがデプロイをブロック。
- CVE-2025-66478 (Critical): React Server Components経由のRCE
- CVE-2025-55183 (Medium): ソースコード漏洩
- CVE-2025-55184 (High): DoS攻撃

**修正内容:**
1. Next.js 15.1.6 → 16.0.10 にアップグレード（全CVEのパッチ済みバージョン）
2. `app/page.tsx` のインポートパスを修正（`/lib/utils` → `@/lib/utils`）
   - Next.js 16はTurbopackがデフォルトで、サーバー相対インポート（`/`始まり）を未サポート
3. `package.json` の build スクリプトに `prisma generate` を追加
   - Vercelのキャッシュにより Prisma Client が自動生成されない問題に対応

**参考リンク:**
- https://nextjs.org/blog/CVE-2025-66478
- https://nextjs.org/blog/security-update-2025-12-11

**パッチ済みバージョン一覧（2025年12月時点）:**
| バージョン系列 | パッチ済み |
|--------------|-----------|
| 15.0.x | 15.0.7 |
| 15.1.x | 15.1.11 |
| 16.0.x | 16.0.10 |

---

### ビルドエラー

#### Prisma Client生成エラー

```bash
# ビルド前にPrisma Clientを生成
npm run postinstall
# または
npx prisma generate
```

#### 環境変数エラー

```
Error: Missing environment variables
```

- Vercel Dashboardで全ての環境変数が設定されているか確認
- 変数名のスペルミスがないか確認

### ランタイムエラー

#### データベース接続エラー

```
Error: Can't reach database server
```

- `DATABASE_URL`が正しいか確認
- NeonのIP許可設定（VercelのIPからのアクセスを許可）

#### Redis接続エラー

```
Error: Upstash Redis credentials not found
```

- `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を確認
- Upstashのデータベースがアクティブか確認

#### APIキーエラー

```
Error: GEMINI_API_KEY environment variable is not set
```

- 各APIキーが正しく設定されているか確認
- Google AI Studioでキーが有効か確認

### 認証エラー

#### OAuthコールバックエラー

```
Error: redirect_uri_mismatch
```

- Google Cloud Consoleの承認済みリダイレクトURIを確認
- `NEXTAUTH_URL`が正しいか確認

## パフォーマンス最適化

### Vercel設定

#### `vercel.json`

```json
{
  "regions": ["hnd1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### ビルド設定

#### 最適化されたビルドコマンド

```json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## バックアップ・リストア

### データベースバックアップ

Neonでは自動バックアップが有効です。手動バックアップも可能：

```bash
# pg_dumpでバックアップ
pg_dump $DATABASE_URL > backup.sql

# リストア
psql $DATABASE_URL < backup.sql
```

### 環境変数のバックアップ

Vercel CLIでエクスポート：

```bash
vercel env pull .env.production
```

## スケーリング

### 自動スケーリング

Vercelは自動的にスケーリングします。制限：

- Hobbyプラン: 10,000 requests/day
- Proプラン: 1,000,000 requests/month

### データベーススケーリング

Neonは自動スケーリングされます。無料枠：

- 500 MB ストレージ
- 190 コンピュート時間/月

## 監視・ログ

### Vercel Analytics

1. Dashboard → Analytics を有効化
2. Web Vitalsの監視

### ログ確認

```bash
# リアルタイムログ
vercel logs --json

# 特定時間のログ
vercel logs --since 1h
```

## カスタムドメイン設定

1. Vercel Dashboard → Settings → Domains
2. ドメインを追加
3. DNSレコードを設定
4. SSL証明書は自動発行

## ロールバック

```bash
# 特定のデプロイメントにロールバック
vercel --rollback

# またはDashboardから過去のデプロイを選択
```
