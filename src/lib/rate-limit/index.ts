/**
 * Rate limiter — selects a store at runtime:
 *   - Redis (distributed) when Upstash credentials are configured.
 *   - In-memory (single instance) otherwise — the dev/test default.
 *
 * The Redis client is dynamically imported only when configured, so the
 * default path carries no Redis dependency (edge-friendly).
 */

import { env } from '@/lib/env';
import { MemoryRateLimitStore } from './memory-store';
import type { RateLimitResult, RateLimitStore, RedisLike } from './types';

let storePromise: Promise<RateLimitStore> | null = null;

async function createStore(): Promise<RateLimitStore> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const [{ RedisRateLimitStore }, { Redis }] = await Promise.all([
      import('./redis-store'),
      import('@upstash/redis'),
    ]);
    const redis = new Redis({ url, token }) as unknown as RedisLike;
    return new RedisRateLimitStore(redis);
  }

  return new MemoryRateLimitStore();
}

function getStore(): Promise<RateLimitStore> {
  if (!storePromise) storePromise = createStore();
  return storePromise;
}

export async function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number,
): Promise<RateLimitResult> {
  const store = await getStore();
  return store.check(identifier, windowMs, maxRequests);
}

export type { RateLimitResult, RateLimitStore } from './types';
