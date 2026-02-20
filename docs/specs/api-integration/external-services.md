# 外部サービス連携仕様

> **外部API・サービスの連携設計**
> 
> **最終更新**: 2026-02-20 13:10

## 連携サービス一覧

| サービス | 用途 | 認証方式 |
|---------|------|---------|
| **Google OAuth** | ユーザー認証 | OAuth 2.0 |
| **Google Drive** | ファイル参照 | OAuth Scope |
| **Google AI Studio** | Gemini API | API Key |
| **xAI** | Grok API | API Key |
| **Perplexity** | 検索API | API Key |
| **OpenAI** | GPT API | API Key（オプション） |
| **Anthropic** | Claude API | API Key（オプション） |
| **Neon** | PostgreSQL | 接続文字列 |
| **Upstash** | Redis | REST API Token |

## 認証情報管理

### 環境変数

```bash
# 認証
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=

# LLM APIs
GEMINI_API_KEY=
XAI_API_KEY=
PERPLEXITY_API_KEY=
OPENAI_API_KEY=        # オプション
ANTHROPIC_API_KEY=     # オプション

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
