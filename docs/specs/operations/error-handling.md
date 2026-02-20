# エラーハンドリング仕様

> **アプリケーション全体のエラー処理方針**

## エラー分類

| 種別 | 説明 | ハンドリング |
|-----|------|-------------|
| `AppError` | 業務エラー（予期済み） | ユーザーにメッセージ表示 |
| `ValidationError` | 入力検証エラー | フォームにエラー表示 |
| `NetworkError` | ネットワーク/外部APIエラー | リトライまたは代替表示 |
| `SystemError` | システムエラー（予期外） | エラーページ表示、ログ記録 |

## エラーレスポンス形式

```typescript
// APIエラーレスポンス
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": [
      { "field": "email", "message": "有効なメールアドレスを入力してください" }
    ]
  }
}
```

## エラーコード一覧

| コード | HTTP | 説明 |
|-------|------|------|
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | アクセス権限なし |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `VALIDATION_ERROR` | 422 | 入力検証エラー |
| `RATE_LIMIT` | 429 | レート制限超過 |
| `INTERNAL_ERROR` | 500 | 内部サーバーエラー |
| `EXTERNAL_API_ERROR` | 502 | 外部APIエラー |

## フロントエンドでの表示

| エラー種別 | 表示方法 |
|-----------|---------|
| フォーム検証 | フィールド横にエラーメッセージ |
| 業務エラー | Toast通知（赤） |
| 成功 | Toast通知（緑） |
| システムエラー | エラーページ（error.tsx） |

## ログ記録

- 全てのエラーは `lib/logger.ts` で記録
- 構造: `{ timestamp, level, code, message, stack, context }`
- 詳細: [logging-monitoring.md](./logging-monitoring.md)

## 関連ファイル

- `lib/errors.ts` - カスタムエラークラス
- `app/error.tsx` - エラーバウンダリー
- `app/global-error.tsx` - グローバルエラーハンドラ
