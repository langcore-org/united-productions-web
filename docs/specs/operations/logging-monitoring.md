# ログ・監視仕様

> **ログ記録とシステム監視の設計**

## ログレベル

| レベル | 用途 | 出力先 |
|--------|------|--------|
| `DEBUG` | 開発時の詳細情報 | 開発環境のみ |
| `INFO` | 一般的な情報 | 全環境 |
| `WARN` | 警告（潜在的な問題） | 全環境 |
| `ERROR` | エラー発生時 | 全環境 |
| `AUDIT` | 監査対象のユーザー操作 | 全環境 |

## ログカテゴリ

| カテゴリ | 用途 |
|----------|------|
| `AUTH` | 認証・認可関連 |
| `API` | API呼び出し |
| `DB` | データベース操作 |
| `SYSTEM` | システムイベント |
| `USER_ACTION` | ユーザー操作 |
| `SECURITY` | セキュリティイベント |
| `PERFORMANCE` | パフォーマンス測定 |

## 使用方法

```typescript
import { logger } from "@/lib/logger";

logger.info("API", "リクエスト受信", { path: "/api/meeting-notes" });
logger.error("DB", "接続エラー", error);
logger.audit("ユーザーが書類を作成", userId, { documentId: "123" });
```

## レート制限

Upstash Redisによるスライディングウィンドウ制限。

| 制限 | 値 |
|-----|-----|
| RPM | 30 |
| RPD | 1,500 |

レスポンスヘッダー:
```
X-RateLimit-Limit-RPM: 30
X-RateLimit-Remaining-RPM: 25
```

超過時: HTTP 429

## 監視項目

| 項目 | 方法 |
|-----|------|
| Core Web Vitals | Vercel Analytics |
| エラー監視 | Vercel Logs |
| API使用量 | `UsageLog`モデル |
| コスト | `UsageLog.cost`集計 |

## 関連仕様

| 項目 | 参照先 |
|-----|--------|
| エラーハンドリング | [error-handling.md](./error-handling.md) |
| パフォーマンス基準 | [performance.md](./performance.md) |
| セキュリティ監視 | [security.md](./security.md) |
