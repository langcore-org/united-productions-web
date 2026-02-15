/**
 * Redis Client (Upstash)
 *
 * Upstash Redis REST APIを使用したキャッシュクライアント
 * 無料枠: 10,000コマンド/日
 */

import { Redis } from '@upstash/redis';

/**
 * Redisクライアントのシングルトンインスタンス
 */
let redisClient: Redis | null = null;

/**
 * Redisクライアントを取得または初期化
 * 環境変数からUpstashの認証情報を読み込む
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Upstash Redis credentials not found. ' +
      'Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local'
    );
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

/**
 * Redisが設定されているかどうかを確認
 * 開発環境などでRedisなしで動作させる場合に使用
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Redisクライアントを取得（未設定時はnullを返す）
 */
export function getRedisClientOrNull(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    return getRedisClient();
  } catch {
    return null;
  }
}

/**
 * キャッシュキーを生成
 * プレフィックスを付与して名前空間を分離
 */
export function createCacheKey(prefix: string, identifier: string): string {
  return `aihub:${prefix}:${identifier}`;
}

/**
 * キャッシュのTTL設定（秒）
 */
export const CACHE_TTL = {
  /** LLMレスポンスキャッシュ: 24時間 */
  LLM_RESPONSE: 24 * 60 * 60,
  /** レート制限カウント: 1分 */
  RATE_LIMIT_MINUTE: 60,
  /** レート制限カウント: 1日 */
  RATE_LIMIT_DAY: 24 * 60 * 60,
  /** セッション: 30分 */
  SESSION: 30 * 60,
  /** 一時データ: 5分 */
  TEMP: 5 * 60,
} as const;
