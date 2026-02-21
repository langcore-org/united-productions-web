/**
 * LLM Response Cache
 *
 * LLMレスポンスをRedisにキャッシュして同じプロンプトの重複リクエストを削減
 * キャッシュキー: プロンプト内容 + プロバイダーIDのハッシュ
 * TTL: 24時間
 */

import { createHash } from 'crypto';
import { getRedisClientOrNull, createCacheKey, CACHE_TTL } from '@/lib/cache/redis';
import type { LLMProvider, LLMMessage, LLMResponse } from './types';

/**
 * キャッシュエントリの型
 */
interface CacheEntry {
  /** レスポンス内容 */
  response: LLMResponse;
  /** キャッシュ作成時刻 */
  cachedAt: string;
  /** プロバイダーID */
  provider: LLMProvider;
  /** プロンプトハッシュ（検証用） */
  promptHash: string;
}

/**
 * メッセージ配列からキャッシュキー用のハッシュを生成
 * 同じプロンプト+プロバイダーは同じハッシュになる
 */
export function generateCacheKey(
  messages: LLMMessage[],
  provider: LLMProvider
): string {
  // メッセージ内容を正規化して連結
  const normalizedPrompt = messages
    .map((m) => `${m.role}:${m.content.trim()}`)
    .join('\n');

  // SHA-256ハッシュを生成
  const hash = createHash('sha256')
    .update(`${provider}:${normalizedPrompt}`)
    .digest('hex');

  // 短縮形のキーを返す（Redisのキー長を節約）
  return createCacheKey('llm', hash.slice(0, 32));
}

/**
 * LLMレスポンスをキャッシュに保存
 *
 * @param messages - リクエストメッセージ
 * @param provider - 使用したプロバイダー
 * @param response - LLMレスポンス
 * @returns 保存成功したかどうか
 */
export async function cacheLLMResponse(
  messages: LLMMessage[],
  provider: LLMProvider,
  response: LLMResponse
): Promise<boolean> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return false;
  }

  try {
    const key = generateCacheKey(messages, provider);
    const promptHash = createHash('sha256')
      .update(messages.map((m) => m.content).join(''))
      .digest('hex')
      .slice(0, 16);

    const entry: CacheEntry = {
      response,
      cachedAt: new Date().toISOString(),
      provider,
      promptHash,
    };

    await redis.setex(key, CACHE_TTL.LLM_RESPONSE, JSON.stringify(entry));
    return true;
  } catch (error) {
    console.error('Failed to cache LLM response:', error);
    return false;
  }
}

/**
 * キャッシュからLLMレスポンスを取得
 *
 * @param messages - リクエストメッセージ
 * @param provider - 使用するプロバイダー
 * @returns キャッシュされたレスポンス（存在しない場合はnull）
 */
export async function getCachedLLMResponse(
  messages: LLMMessage[],
  provider: LLMProvider
): Promise<LLMResponse | null> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return null;
  }

  try {
    const key = generateCacheKey(messages, provider);
    const data = await redis.get<string>(key);

    if (!data) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(data);

    // プロバイダー一致確認（追加の検証）
    if (entry.provider !== provider) {
      return null;
    }

    // キャッシュヒットをログ（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LLM Cache] Hit for ${provider}, cached at ${entry.cachedAt}`);
    }

    return entry.response;
  } catch (error) {
    console.error('Failed to get cached LLM response:', error);
    return null;
  }
}

/**
 * キャッシュを無効化（削除）
 *
 * @param messages - リクエストメッセージ
 * @param provider - プロバイダー
 * @returns 削除成功したかどうか
 */
export async function invalidateLLMCache(
  messages: LLMMessage[],
  provider: LLMProvider
): Promise<boolean> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return false;
  }

  try {
    const key = generateCacheKey(messages, provider);
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Failed to invalidate LLM cache:', error);
    return false;
  }
}

/**
 * 特定のプロバイダーの全キャッシュをクリア
 *
 * @param provider - クリアするプロバイダー（省略時は全プロバイダー）
 * @returns 削除されたキー数
 */
export async function clearLLMCache(provider?: LLMProvider): Promise<number> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return 0;
  }

  try {
    // パターンに一致するキーを検索
    const pattern = provider
      ? `aihub:llm:*:${provider}:*`
      : 'aihub:llm:*';

    // Upstash RedisはSCANをサポート
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

    // 一括削除
    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Failed to clear LLM cache:', error);
    return 0;
  }
}

/**
 * キャッシュ統計を取得
 *
 * @returns キャッシュ統計情報
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  providers: Record<string, number>;
}> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return { totalKeys: 0, providers: {} };
  }

  try {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await redis.scan(cursor, { match: 'aihub:llm:*', count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    // プロバイダー別に集計
    const providers: Record<string, number> = {};

    for (const key of keys) {
      const data = await redis.get<string>(key);
      if (data) {
        try {
          const entry: CacheEntry = JSON.parse(data);
          providers[entry.provider] = (providers[entry.provider] || 0) + 1;
        } catch {
          // パースエラーは無視
        }
      }
    }

    return {
      totalKeys: keys.length,
      providers,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { totalKeys: 0, providers: {} };
  }
}

// ============================================================================
// シンプルキャッシュインターフェース
// ============================================================================

/**
 * キャッシュからLLMレスポンスを取得
 *
 * @param key - プロンプトハッシュを含むキャッシュキー
 * @returns キャッシュされたレスポンス（存在しない場合はnull）
 */
export async function getCachedResponse(key: string): Promise<LLMResponse | null> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return null;
  }

  try {
    const cacheKey = createCacheKey('llm', key);
    const data = await redis.get<string>(cacheKey);

    if (!data) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(data);
    return entry.response;
  } catch (error) {
    console.error('Failed to get cached response:', error);
    return null;
  }
}

/**
 * LLMレスポンスをキャッシュに保存
 *
 * @param key - プロンプトハッシュを含むキャッシュキー
 * @param response - LLMレスポンス
 * @param ttl - 有効期限（秒）、省略時は24時間
 */
export async function setCachedResponse(
  key: string,
  response: LLMResponse,
  ttl?: number
): Promise<void> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return;
  }

  try {
    const cacheKey = createCacheKey('llm', key);
    const effectiveTtl = ttl ?? CACHE_TTL.LLM_RESPONSE;

    const entry: CacheEntry = {
      response,
      cachedAt: new Date().toISOString(),
      provider: 'grok-4-1-fast-reasoning', // デフォルト値（汎用キャッシュ用）
      promptHash: key.slice(0, 16),
    };

    await redis.setex(cacheKey, effectiveTtl, JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to set cached response:', error);
  }
}

/**
 * キャッシュをクリア
 *
 * @param pattern - 削除するキーのパターン（省略時は全LLMキャッシュ）
 */
export async function clearCache(pattern?: string): Promise<void> {
  const redis = getRedisClientOrNull();
  if (!redis) {
    return;
  }

  try {
    const searchPattern = pattern
      ? `aihub:llm:*${pattern}*`
      : 'aihub:llm:*';

    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await redis.scan(cursor, { match: searchPattern, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
