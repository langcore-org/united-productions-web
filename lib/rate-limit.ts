/**
 * Rate Limiting
 *
 * LLM APIのレート制限を管理（RPM: Requests Per Minute, RPD: Requests Per Day）
 * Upstash Redisを使用して分散環境でも制限を共有
 *
 * Google AI Studio無料枠:
 * - Gemini 2.5 Flash-Lite: 30 RPM / 1,500 RPD
 * - Gemini 3.0 Flash: 30 RPM / 1,500 RPD
 */

import { getRedisClientOrNull, createCacheKey, CACHE_TTL } from '@/lib/cache/redis';
import type { LLMProvider } from '@/lib/llm/types';

/**
 * レート制限設定
 */
export interface RateLimitConfig {
  /** Requests Per Minute（1分あたりのリクエスト数） */
  rpm: number;
  /** Requests Per Day（1日あたりのリクエスト数） */
  rpd: number;
}

/**
 * プロバイダー別のデフォルトレート制限設定
 * 無料枠を前提とした設定
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Google AI Studio 無料枠
  'gemini-2.5-flash-lite': { rpm: 30, rpd: 1500 },
  'gemini-3.0-flash': { rpm: 30, rpd: 1500 },
  // xAI（デフォルト制限）
  'grok-4-1-fast-reasoning': { rpm: 60, rpd: 10000 },
  'grok-4-0709': { rpm: 60, rpd: 10000 },
  // OpenAI（デフォルト制限）
  'gpt-4o-mini': { rpm: 60, rpd: 10000 },
  'gpt-5': { rpm: 60, rpd: 10000 },
  // Anthropic（デフォルト制限）
  'claude-sonnet-4.5': { rpm: 60, rpd: 10000 },
  'claude-opus-4.6': { rpm: 60, rpd: 10000 },
  // Perplexity（デフォルト制限）
  'perplexity-sonar': { rpm: 60, rpd: 10000 },
  'perplexity-sonar-pro': { rpm: 60, rpd: 10000 },
};

/**
 * レート制限チェック結果
 */
export interface RateLimitResult {
  /** リクエスト許可されるか */
  allowed: boolean;
  /** 現在のRPM使用量 */
  currentRpm: number;
  /** 現在のRPD使用量 */
  currentRpd: number;
  /** RPM制限値 */
  limitRpm: number;
  /** RPD制限値 */
  limitRpd: number;
  /** 次にリクエスト可能になる時刻（制限時のみ） */
  retryAfter?: number;
  /** 残りRPM */
  remainingRpm: number;
  /** 残りRPD */
  remainingRpd: number;
}

/**
 * レート制限キーを生成
 */
function getRateLimitKeys(provider: LLMProvider, identifier: string): {
  rpmKey: string;
  rpdKey: string;
} {
  return {
    rpmKey: createCacheKey('ratelimit', `${provider}:rpm:${identifier}`),
    rpdKey: createCacheKey('ratelimit', `${provider}:rpd:${identifier}`),
  };
}

/**
 * レート制限をチェック
 *
 * @param provider - LLMプロバイダー
 * @param identifier - 識別子（ユーザーIDやIPアドレス等）
 * @param config - カスタムレート制限設定（省略時はデフォルト）
 * @returns レート制限チェック結果
 */
export async function checkRateLimit(
  provider: LLMProvider,
  identifier: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClientOrNull();

  // レート制限設定を取得
  const limits = config ?? DEFAULT_RATE_LIMITS[provider] ?? { rpm: 30, rpd: 1500 };

  // Redis未設定時は制限なしで許可（開発環境用）
  if (!redis) {
    return {
      allowed: true,
      currentRpm: 0,
      currentRpd: 0,
      limitRpm: limits.rpm,
      limitRpd: limits.rpd,
      remainingRpm: limits.rpm,
      remainingRpd: limits.rpd,
    };
  }

  try {
    const { rpmKey, rpdKey } = getRateLimitKeys(provider, identifier);

    // 現在のカウントを取得（パイプラインで効率化）
    const pipeline = redis.pipeline();
    pipeline.get(rpmKey);
    pipeline.get(rpdKey);
    pipeline.ttl(rpmKey);
    pipeline.ttl(rpdKey);

    const results = await pipeline.exec();
    const currentRpm = parseInt((results?.[0] as string) ?? '0', 10);
    const currentRpd = parseInt((results?.[1] as string) ?? '0', 10);
    const rpmTtl = (results?.[2] as number) ?? 0;
    const rpdTtl = (results?.[3] as number) ?? 0;

    // 制限チェック
    const rpmExceeded = currentRpm >= limits.rpm;
    const rpdExceeded = currentRpd >= limits.rpd;

    if (rpmExceeded || rpdExceeded) {
      // 次にリクエスト可能になるまでの時間を計算
      const retryAfter = rpmExceeded ? rpmTtl : rpdTtl;

      return {
        allowed: false,
        currentRpm,
        currentRpd,
        limitRpm: limits.rpm,
        limitRpd: limits.rpd,
        retryAfter: Math.max(0, retryAfter),
        remainingRpm: Math.max(0, limits.rpm - currentRpm),
        remainingRpd: Math.max(0, limits.rpd - currentRpd),
      };
    }

    return {
      allowed: true,
      currentRpm,
      currentRpd,
      limitRpm: limits.rpm,
      limitRpd: limits.rpd,
      remainingRpm: limits.rpm - currentRpm - 1,
      remainingRpd: limits.rpd - currentRpd - 1,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // エラー時は制限なしで許可（フェイルオープン）
    return {
      allowed: true,
      currentRpm: 0,
      currentRpd: 0,
      limitRpm: limits.rpm,
      limitRpd: limits.rpd,
      remainingRpm: limits.rpm,
      remainingRpd: limits.rpd,
    };
  }
}

/**
 * レート制限カウントを増加
 *
 * @param provider - LLMプロバイダー
 * @param identifier - 識別子
 * @returns 増加成功したかどうか
 */
export async function incrementRateLimit(
  provider: LLMProvider,
  identifier: string
): Promise<boolean> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return false;
  }

  try {
    const { rpmKey, rpdKey } = getRateLimitKeys(provider, identifier);

    // パイプラインで原子性を保ちながらインクリメント
    const pipeline = redis.pipeline();

    // RPMカウンタ: 存在しない場合はTTL付きで初期化
    pipeline.incr(rpmKey);
    // RPDカウンタ: 存在しない場合はTTL付きで初期化
    pipeline.incr(rpdKey);

    const results = await pipeline.exec();
    const newRpm = results?.[0] as number;
    const newRpd = results?.[1] as number;

    // 新規作成時のみTTLを設定
    const ttlPipeline = redis.pipeline();
    if (newRpm === 1) {
      ttlPipeline.expire(rpmKey, CACHE_TTL.RATE_LIMIT_MINUTE);
    }
    if (newRpd === 1) {
      ttlPipeline.expire(rpdKey, CACHE_TTL.RATE_LIMIT_DAY);
    }
    await ttlPipeline.exec();

    return true;
  } catch (error) {
    console.error('Rate limit increment failed:', error);
    return false;
  }
}

/**
 * レート制限を消費（チェックと増加をまとめて実行）
 *
 * @param provider - LLMプロバイダー
 * @param identifier - 識別子
 * @param config - カスタムレート制限設定
 * @returns レート制限結果（allowedがfalseの場合はカウント増加しない）
 */
export async function consumeRateLimit(
  provider: LLMProvider,
  identifier: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const result = await checkRateLimit(provider, identifier, config);

  if (result.allowed) {
    await incrementRateLimit(provider, identifier);
  }

  return result;
}

/**
 * レート制限ヘッダーを生成
 * APIレスポンスに含めるRateLimitヘッダー用
 *
 * @param result - レート制限チェック結果
 * @returns ヘッダー用オブジェクト
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit-RPM': String(result.limitRpm),
    'X-RateLimit-Limit-RPD': String(result.limitRpd),
    'X-RateLimit-Remaining-RPM': String(result.remainingRpm),
    'X-RateLimit-Remaining-RPD': String(result.remainingRpd),
    'X-RateLimit-Used-RPM': String(result.currentRpm),
    'X-RateLimit-Used-RPD': String(result.currentRpd),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * レート制限統計を取得
 *
 * @param provider - プロバイダー（省略時は全プロバイダー）
 * @param identifier - 識別子（省略時は全識別子）
 * @returns 統計情報
 */
export async function getRateLimitStats(
  provider?: LLMProvider,
  identifier?: string
): Promise<{
  totalEntries: number;
  providers: Record<string, { rpm: number; rpd: number }>;
}> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return { totalEntries: 0, providers: {} };
  }

  try {
    const pattern = provider
      ? identifier
        ? `aihub:ratelimit:${provider}:*:${identifier}`
        : `aihub:ratelimit:${provider}:*`
      : 'aihub:ratelimit:*';

    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    const providers: Record<string, { rpm: number; rpd: number }> = {};

    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 4) {
        const prov = parts[2];
        const type = parts[3]; // 'rpm' or 'rpd'

        if (!providers[prov]) {
          providers[prov] = { rpm: 0, rpd: 0 };
        }

        const value = await redis.get<number>(key);
        if (type === 'rpm') {
          providers[prov].rpm += value ?? 0;
        } else if (type === 'rpd') {
          providers[prov].rpd += value ?? 0;
        }
      }
    }

    return {
      totalEntries: keys.length,
      providers,
    };
  } catch (error) {
    console.error('Failed to get rate limit stats:', error);
    return { totalEntries: 0, providers: {} };
  }
}

/**
 * レート制限をリセット
 *
 * @param provider - プロバイダー
 * @param identifier - 識別子（省略時は全識別子）
 * @returns 削除されたキー数
 */
export async function resetRateLimit(
  provider: LLMProvider,
  identifier?: string
): Promise<number> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return 0;
  }

  try {
    const pattern = identifier
      ? `aihub:ratelimit:${provider}:*:${identifier}`
      : `aihub:ratelimit:${provider}:*`;

    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return 0;
  }
}
