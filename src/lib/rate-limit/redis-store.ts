/**
 * Distributed sliding-window rate limiter backed by Redis sorted sets.
 * Depends only on the RedisLike interface (Dependency Inversion) so it is
 * decoupled from the concrete Upstash client and fully unit-testable.
 */

import type { RateLimitResult, RateLimitStore, RedisLike } from './types';

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: RedisLike) {}

  async check(identifier: string, windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rl:${identifier}`;

    await this.redis.zremrangebyscore(key, 0, now - windowMs);
    await this.redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    const count = await this.redis.zcard(key);
    await this.redis.pexpire(key, windowMs);

    if (count > maxRequests) {
      const oldest = await this.redis.zrange(key, 0, 0, { withScores: true });
      const oldestScore = oldest.length >= 2 ? Number(oldest[1]) : now;
      return { allowed: false, remaining: 0, resetMs: oldestScore + windowMs - now };
    }

    return { allowed: true, remaining: maxRequests - count, resetMs: windowMs };
  }
}
