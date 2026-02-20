# セキュリティ仕様

> **アプリケーションのセキュリティ対策**

## 認証・認可

- NextAuth.jsによるOAuth認証
- 詳細: [authentication.md](./authentication.md)

## 通信セキュリティ

| 項目 | 設定 |
|-----|------|
| HTTPS | 必須（本番環境） |
| HSTS | max-age=31536000 |
| 安全なCookie | Secure, HttpOnly, SameSite=Lax |

## CORS設定

```typescript
// 許可オリジン
allowedOrigins: [
  'https://up-agent.vercel.app',
  'https://up-agent-staging.vercel.app'
]
```

## Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.upstash.io https://generativelanguage.googleapis.com;
```

## 入力検証

| レイヤー | 方法 |
|---------|------|
| クライアント | Zodスキーマ（フォーム） |
| API | Zodスキーマ（リクエスト） |
| DB | Prismaスキーマ（型制約） |

## 機密情報管理

| 情報 | 管理方法 |
|-----|---------|
| APIキー | 環境変数（Vercel Secrets） |
| DB接続文字列 | 環境変数 |
| JWTシークレット | 環境変数 |

## レート制限

- Upstash RedisによるIPベース制限
- 詳細: [logging-monitoring.md](./logging-monitoring.md#レート制限)

## 依存パッケージの脆弱性対応

- Dependabotアラート有効化
- 週次での `npm audit` 実行
- 重大な脆弱性は即座に対応

## 関連ファイル

- `middleware.ts` - セキュリティヘッダー設定
- `next.config.ts` - CSP設定
