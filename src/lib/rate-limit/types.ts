/**
 * Rate-limit store contracts — SSOT for the strategy interface.
 * Implementations: in-memory (single instance) and Redis (distributed).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface RateLimitStore {
  check(identifier: string, windowMs: number, maxRequests: number): Promise<RateLimitResult>;
}

/**
 * Minimal Redis surface the distributed store depends on (Dependency Inversion).
 * The real Upstash client satisfies this; tests supply an in-memory fake.
 */
export interface RedisLike {
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zadd(key: string, entry: { score: number; member: string }): Promise<number | null>;
  zcard(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { withScores?: boolean },
  ): Promise<(string | number)[]>;
}
