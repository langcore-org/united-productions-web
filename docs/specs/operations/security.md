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
script-src 'self' 'unsafe-inline';              // 本番環境（unsafe-eval除外）
script-src 'self' 'unsafe-eval' 'unsafe-inline'; // 開発環境（React HMR用）
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https://api.x.ai https://api.perplexity.ai https://generativelanguage.googleapis.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### CSP設定の詳細

| ディレクティブ | 設定値 | 説明 |
|--------------|--------|------|
| `default-src` | `'self'` | デフォルトですべてのリソースを同一生成元に制限 |
| `script-src` | `'self' 'unsafe-inline'`（本番）<br>`'self' 'unsafe-eval' 'unsafe-inline'`（開発） | **本番環境では `unsafe-eval` を除外**してXSS対策を強化。開発環境ではReact HMRのために `unsafe-eval` を許可 |
| `style-src` | `'self' 'unsafe-inline'` | インラインスタイルを許可（UIフレームワークで必要） |
| `img-src` | `'self' data: https:` | データURI画像とHTTPS画像を許可 |
| `connect-src` | `'self' https://api.x.ai https://api.perplexity.ai https://generativelanguage.googleapis.com` | LLM API（xAI, Perplexity, Gemini）への接続を許可 |
| `frame-ancestors` | `'none'` | クリックジャッキング対策 |
| `base-uri` | `'self'` | `<base>` タグの制限 |
| `form-action` | `'self'` | フォーム送信先を制限 |

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
