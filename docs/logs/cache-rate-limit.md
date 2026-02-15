# キャッシュ・レート制限実装ログ

## 概要

LLM APIのコスト最適化と安定性向上のため、キャッシュとレート制限を実装。

## 実装内容

### 1. Redisクライアント（Upstash）`lib/cache/redis.ts`

**コミット:** `[CACHE] Redisクライアント（Upstash）実装`

- Upstash Redis REST APIクライアントのシングルトン実装
- 環境変数検証とエラーハンドリング
- キャッシュキー生成ユーティリティ
- TTL設定定数（24時間、1分、1日等）

**使用無料枠:**
- Upstash Redis無料枠: 10,000コマンド/日

### 2. LLMレスポンスキャッシュ `lib/llm/cache.ts`

**コミット:** `[CACHE] LLMレスポンスキャッシュ実装`

- 同じプロンプト+プロバイダーは24時間キャッシュ
- SHA-256ハッシュによるキャッシュキー生成
- キャッシュ統計取得機能
- キャッシュ無効化・クリア機能

**キャッシュキー形式:**
```
aihub:llm:<sha256_hash_prefix>
```

**キャッシュエントリ構造:**
```typescript
{
  response: LLMResponse;
  cachedAt: string;
  provider: LLMProvider;
  promptHash: string;
}
```

### 3. レート制限（RPM/RPD）`lib/rate-limit.ts`

**コミット:** `[CACHE] レート制限（RPM/RPD）実装`

- RPM（Requests Per Minute）制限
- RPD（Requests Per Day）制限
- Redisベースの分散レート制限
- レート制限ヘッダー生成

**デフォルト制限:**
| プロバイダー | RPM | RPD |
|-------------|-----|-----|
| Gemini 2.5 Flash-Lite | 30 | 1,500 |
| Gemini 3.0 Flash | 30 | 1,500 |
| その他 | 60 | 10,000 |

**レート制限ヘッダー:**
- `X-RateLimit-Limit-RPM`: RPM制限値
- `X-RateLimit-Limit-RPD`: RPD制限値
- `X-RateLimit-Remaining-RPM`: 残りRPM
- `X-RateLimit-Remaining-RPD`: 残りRPD
- `X-RateLimit-Used-RPM`: 使用済みRPM
- `X-RateLimit-Used-RPD`: 使用済みRPD
- `Retry-After`: 制限時の再試行までの秒数

### 4. 無料枠制限設定 `lib/llm/config.ts`

**コミット:** `[CACHE] 無料枠制限設定追加`

- `FREE_TIER_LIMITS`: 全プロバイダーの無料枠設定
- `UPSTASH_FREE_TIER`: Upstash Redis無料枠設定
- `CACHE_CONFIG`: キャッシュ設定
- `RATE_LIMIT_CONFIG`: レート制限設定

### 5. レート制限ミドルウェア `middleware.ts`

**コミット:** `[CACHE] レート制限ミドルウェア実装`

- API Routesへのレート制限適用
- IPアドレスベースの識別
- パスベースのデフォルトプロバイダー設定
- 429エラーレスポンス生成

**レート制限対象パス:**
- `/api/llm/chat`
- `/api/llm/stream`
- `/api/meeting-notes`
- `/api/transcripts`
- `/api/schedules`
- `/api/research`

**パス別デフォルトプロバイダー:**
| パス | デフォルトプロバイダー |
|------|---------------------|
| `/api/meeting-notes` | `gemini-2.5-flash-lite` |
| `/api/transcripts` | `gemini-2.5-flash-lite` |
| `/api/schedules` | `gemini-2.5-flash-lite` |
| `/api/research` | `perplexity-sonar` |

### 6. LLM Chat APIキャッシュ統合 `app/api/llm/chat/route.ts`

**コミット:** `[CACHE] LLM Chat APIにキャッシュ統合`

- リクエスト時にキャッシュをチェック
- キャッシュヒット時はAPIコールをスキップ
- レスポンスに`cached`フラグを追加
- キャッシュミス時はレスポンスを保存

**レスポンス形式:**
```typescript
// キャッシュヒット時
{
  content: string;
  thinking: string | null;
  usage: LLMUsage | null;
  cached: true;
  cachedAt: string;
}

// キャッシュミス時
{
  content: string;
  thinking: string | null;
  usage: LLMUsage | null;
  cached: false;
}
```

### 7. LLM Stream APIレート制限対応 `app/api/llm/stream/route.ts`

**コミット:** `[CACHE] LLM Stream APIにレート制限対応コメント追加`

- ストリーミングAPIはキャッシュ非対応（リアルタイム性重視）
- ミドルウェアによるレート制限は適用

## 環境変数

```bash
# Upstash Redis（必須）
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

## 依存関係

```json
{
  "@upstash/redis": "^1.x"
}
```

## 使用方法

### キャッシュの確認

```typescript
import { getCacheStats } from '@/lib/llm/cache';

const stats = await getCacheStats();
console.log(stats);
// { totalKeys: 42, providers: { 'gemini-2.5-flash-lite': 30, ... } }
```

### レート制限の確認

```typescript
import { checkRateLimit } from '@/lib/rate-limit';
import { FREE_TIER_LIMITS } from '@/lib/llm/config';

const result = await checkRateLimit(
  'gemini-2.5-flash-lite',
  'user-123',
  FREE_TIER_LIMITS['gemini-2.5-flash-lite']
);

console.log(result);
// { allowed: true, currentRpm: 5, currentRpd: 100, ... }
```

### キャッシュのクリア

```typescript
import { clearLLMCache } from '@/lib/llm/cache';

// 特定のプロバイダーのキャッシュをクリア
await clearLLMCache('gemini-2.5-flash-lite');

// 全キャッシュをクリア
await clearLLMCache();
```

## 注意事項

1. **Upstash Redis無料枠**: 10,000コマンド/日
   - キャッシュ読み書き + レート制限カウントで消費
   - 1日のリクエスト数が多い場合は監視が必要

2. **Gemini無料枠**: 30 RPM / 1,500 RPD
   - レート制限で保護済み
   - 超過時は429エラーが返される

3. **キャッシュの有効期限**: 24時間
   - 同じプロンプトは24時間以内はキャッシュから返却
   - 長期間キャッシュしたい場合はTTL調整が必要

## 今後の改善案

- [ ] キャッシュウォームアップ機能
- [ ] レート制限アラート通知
- [ ] キャッシュヒット率モニタリング
- [ ] プロバイダー自動フォールバック
