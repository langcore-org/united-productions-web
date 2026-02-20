# デプロイガイド

> **Vercelへのデプロイ手順と運用**

## 概要

Vercelプラットフォームへのデプロイを前提とした構成。

## 環境

| 環境 | ブランチ | URL |
|-----|---------|-----|
| 開発 | - | `http://localhost:3000` |
| プレビュー | PR | `https://<branch>--<project>.vercel.app` |
| 本番 | `main` | `https://<project>.vercel.app` |

## 必須環境変数

| 変数名 | 説明 | 取得元 |
|-------|------|--------|
| `NEXTAUTH_SECRET` | JWT署名用 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 本番URL | デプロイ後に設定 |
| `GOOGLE_CLIENT_ID` | OAuthクライアントID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuthシークレット | Google Cloud Console |
| `DATABASE_URL` | DB接続文字列 | Neon Dashboard |
| `UPSTASH_REDIS_REST_URL` | Redis URL | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | Redisトークン | Upstash Console |
| `GEMINI_API_KEY` | Gemini APIキー | Google AI Studio |

オプション:
| `XAI_API_KEY` | Grok APIキー | xAI Console |
| `PERPLEXITY_API_KEY` | Perplexity APIキー | Perplexity Settings |

## デプロイ手順

### 1. 初回デプロイ

```bash
# Vercel CLIでプロジェクト作成
vercel

# 環境変数設定（一括）
grep -v '^#' .env.local | grep -v '^$' | while IFS='=' read -r key value; do
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//')
  echo -n "$value" | vercel env add "$key" production
done

# DBマイグレーション
npx prisma migrate deploy

# デプロイ
vercel --prod
```

### 2. 継続的デプロイ

```bash
# mainブランチへのプッシュで自動デプロイ
git push origin main
```

## ビルド設定

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## トラブルシューティング

| 症状 | 原因 | 対応 |
|-----|------|------|
| Prisma Clientエラー | 生成されていない | `postinstall`スクリプト確認 |
| DB接続エラー | URL誤り | Neonダッシュボード確認 |
| OAuthエラー | リダイレクトURI誤り | Google Cloud Console確認 |

詳細なトラブルシューティング: `docs/logs/` 参照

## 関連仕様

| 項目 | 参照先 |
|-----|--------|
| 環境構築手順 | [guides/setup/](../guides/setup/) |
| 認証設定 | [authentication.md](./authentication.md) |
| セキュリティ | [security.md](./security.md) |
| 監視・ログ | [logging-monitoring.md](./logging-monitoring.md) |
