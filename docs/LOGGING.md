# アプリケーションログシステム

## 概要

本アプリケーションは統一的なログシステムを提供します。エラー追跡、監査証跡、パフォーマンス監視などに使用できます。

## ログモデル

### ログレベル

| レベル | 用途 |
|--------|------|
| DEBUG | 開発時のデバッグ情報 |
| INFO | 一般的な情報 |
| WARN | 警告（潜在的な問題） |
| ERROR | エラー発生時 |
| AUDIT | 監査対象のユーザー操作 |

### ログカテゴリ

| カテゴリ | 用途 |
|----------|------|
| AUTH | 認証・認可関連 |
| API | API呼び出し |
| DB | データベース操作 |
| SYSTEM | システムイベント |
| USER_ACTION | ユーザー操作 |
| SECURITY | セキュリティイベント |
| PERFORMANCE | パフォーマンス測定 |

## 使用方法

### 基本的なログ記録

```typescript
import { logger } from "@/lib/logger";

// 各レベルでログを記録
logger.debug("API", "デバッグメッセージ", { detail: "value" });
logger.info("SYSTEM", "システム起動完了");
logger.warn("API", "レート制限に近づいています");
logger.error("DB", "データベース接続エラー", error);

// 監査ログ
logger.audit("ユーザーが書類を作成", userId, { documentId: "123" });
```

### API呼び出しのログ記録

```typescript
import { logApiCall } from "@/lib/logger";

const startTime = Date.now();
try {
  const result = await apiCall();
  const duration = Date.now() - startTime;
  await logApiCall("/api/meeting-notes", "POST", duration, userId, 200);
} catch (error) {
  const duration = Date.now() - startTime;
  await logApiCall("/api/meeting-notes", "POST", duration, userId, 500);
  throw error;
}
```

### 認証イベントのログ記録

```typescript
import { logAuth } from "@/lib/logger";

// ログイン成功
await logAuth("login", userId, userEmail, ipAddress);

// ログアウト
await logAuth("logout", userId);

// 認証失敗
await logAuth("failed", "", attemptedEmail, ipAddress);
```

## 管理画面でのログ閲覧

### アクセス方法

`/admin/logs` または管理画面トップから「アプリケーションログ」リンク

### 機能

1. **フィルタリング**
   - キーワード検索
   - ログレベル（DEBUG/INFO/WARN/ERROR/AUDIT）
   - カテゴリ（AUTH/API/DB/SYSTEM/USER_ACTION/SECURITY/PERFORMANCE）

2. **ソート**
   - 日時（昇順/降順）
   - レベル
   - カテゴリ

3. **ページネーション**
   - 1ページ50件表示
   - ページ切り替え

4. **自動更新**
   - 10秒ごとに自動更新（ON/OFF切替可能）

5. **詳細表示**
   - モーダルで詳細情報を表示
   - スタックトレース、リクエスト情報など

6. **ログ削除**
   - 30日以上古いログを一括削除

## データベーススキーマ

```prisma
model AppLog {
  id          String      @id @default(uuid())
  level       LogLevel    // DEBUG | INFO | WARN | ERROR | AUDIT
  category    LogCategory // AUTH | API | DB | SYSTEM | USER_ACTION | SECURITY | PERFORMANCE
  message     String      @db.Text
  details     Json?       // 詳細情報
  
  // ユーザー情報
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  
  // リクエスト情報
  requestId   String?
  path        String?
  method      String?
  ip          String?
  userAgent   String?
  
  // パフォーマンス
  duration    Int?        // 処理時間（ms）
  
  // エラー情報
  errorCode   String?
  stackTrace  String?     @db.Text
  
  createdAt   DateTime    @default(now())
}
```

## パフォーマンス考慮事項

1. **非同期処理**: ログ記録は非同期で実行され、メイン処理をブロックしません
2. **失敗時の対応**: DBへの記録失敗は無視され、コンソールには出力されます
3. **レベルフィルタ**: 環境変数 `LOG_LEVEL` で最小ログレベルを制御可能
4. **自動削除**: 30日以上古いログは定期的に削除することを推奨

## 環境変数

```bash
# 最小ログレベル（DEBUG | INFO | WARN | ERROR | AUDIT）
LOG_LEVEL=INFO
```

## APIエンドポイント

### GET /api/admin/logs

ログ一覧を取得します。

**Query Parameters:**
- `level`: ログレベルでフィルタ
- `category`: カテゴリでフィルタ
- `search`: キーワード検索
- `page`: ページ番号（1-based）
- `limit`: 1ページあたりの件数（最大100）
- `sortBy`: ソート項目
- `sortOrder`: asc | desc

### DELETE /api/admin/logs

古いログを削除します。

**Query Parameters:**
- `days`: 保持日数（これより古いログを削除）
