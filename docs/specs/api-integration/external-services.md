# 外部サービス連携仕様

> **外部API・サービスの連携設計**
> 
> **最終更新**: 2026-02-21 17:25

## 連携サービス一覧

### 現在連携済み

| サービス | 用途 | 認証方式 | 状態 |
|---------|------|---------|------|
| **Google OAuth** | ユーザー認証 | OAuth 2.0 | ✅ 連携済み |
| **Google Drive** | ファイル参照 | OAuth Scope | ✅ 連携済み |
| **Google AI Studio** | Gemini API | API Key | ✅ 連携済み |
| **xAI** | Grok API | API Key | ✅ 連携済み |
| **Neon** | PostgreSQL | 接続文字列 | ✅ 連携済み |
| **Upstash** | Redis | REST API Token | ✅ 連携済み |

### 将来連携予定

| サービス | 用途 | 認証方式 | 状態 |
|---------|------|---------|------|
| **Perplexity** | 検索API | API Key | 📝 将来連携予定 |
| **OpenAI** | GPT API | API Key | 📝 将来連携予定 |
| **Anthropic** | Claude API | API Key | 📝 将来連携予定 |

## 認証情報管理

### 環境変数

```bash
# 認証
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=

# LLM APIs（連携済み）
GEMINI_API_KEY=
XAI_API_KEY=

# LLM APIs（将来連携予定）
# PERPLEXITY_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=

# インフラ
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### セキュリティ

- APIキーは**サーバーサイドのみ**で使用
- クライアントに露出しない
- Vercel Secretsで管理

詳細: [security.md](./security.md)

## LLM API統合

### 統一インターフェース

```typescript
// lib/llm/types.ts
interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  stream(messages: LLMMessage[]): AsyncIterable<string>;
}

// Factoryパターン
const client = createLLMClient('gemini-2.5-flash-lite');
```

### エラーハンドリング

| エラー | 対応 |
|-------|------|
| レート制限 | 429エラー、リトライ待機 |
| タイムアウト | 30秒で切断、エラー通知 |
| 無効なAPIキー | 500エラー、管理者通知 |

詳細: [llm-integration.md](./llm-integration.md)

## Google Drive連携

### スコープ

```typescript
// 必要最小限のスコープ
scope: [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.readonly'
]
```

### 機能

| 機能 | エンドポイント |
|-----|--------------|
| ファイル一覧 | `/api/drive/files` |
| ファイルダウンロード | `/api/drive/download` |

## レート制限対策

### Upstash Redisによる制限

| 対象 | 制限 |
|-----|------|
| API全体 | 30 RPM / 1,500 RPD |
| LLM API | プロバイダー別制限に準拠 |

### バックオフ戦略

```typescript
// 指数関数的バックオフ
const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
```

## 障害時のフォールバック

| サービス | 障害時の挙動 |
|---------|------------|
| Gemini | Grokに切り替え（自動） |
| Grok | エラーメッセージ表示 |
| Google Drive | 機能非表示 |
| Redis | キャッシュ無効（DB直接） |

## 関連ファイル

- `lib/llm/clients/` - LLMクライアント実装
- `lib/google/drive.ts` - Drive連携
- `lib/rate-limit.ts` - レート制限
- [deployment-guide.md](./deployment-guide.md) - 環境変数設定
