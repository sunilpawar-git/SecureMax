/**
 * In-memory sliding-window rate limiter — single-instance / dev / test default.
 * For multi-instance production use the Redis store instead.
 */

import { RATE_LIMITS } from '@/config/security';
import type { RateLimitResult, RateLimitStore } from './types';

interface RateLimitEntry {
  timestamps: number[];
}

const CLEANUP_INTERVAL_MS = 60_000;

export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();

  private cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL_MS) return;
    this.lastCleanup = now;

    const cutoff = now - RATE_LIMITS.GLOBAL_WINDOW_MS;
    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) this.store.delete(key);
    }
  }

  async check(identifier: string, windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    this.cleanup();
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(identifier);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(identifier, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      return { allowed: false, remaining: 0, resetMs: oldestInWindow + windowMs - now };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: maxRequests - entry.timestamps.length, resetMs: windowMs };
  }
}
