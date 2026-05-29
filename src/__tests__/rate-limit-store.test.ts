/**
 * Phase 3 — Distributed rate limiter (#11).
 * TDD: written BEFORE the rate-limit/ store refactor.
 *
 * A single behavioural contract runs against BOTH stores (memory + redis-with-fake)
 * so the two implementations are provably interchangeable (Liskov / strategy).
 */

import { MemoryRateLimitStore } from '@/lib/rate-limit/memory-store';
import { RedisRateLimitStore } from '@/lib/rate-limit/redis-store';
import type { RateLimitStore, RedisLike } from '@/lib/rate-limit/types';

/** Minimal in-memory sorted-set fake implementing the RedisLike surface. */
function makeFakeRedis(): RedisLike {
  const sets = new Map<string, { score: number; member: string }[]>();
  return {
    async zremrangebyscore(key, min, max) {
      const arr = sets.get(key) ?? [];
      const kept = arr.filter((e) => e.score < min || e.score > max);
      sets.set(key, kept);
      return arr.length - kept.length;
    },
    async zadd(key, entry) {
      const arr = sets.get(key) ?? [];
      arr.push(entry);
      sets.set(key, arr);
      return 1;
    },
    async zcard(key) {
      return (sets.get(key) ?? []).length;
    },
    async pexpire() {
      return 1;
    },
    async zrange(key, start, stop) {
      const arr = [...(sets.get(key) ?? [])].sort((a, b) => a.score - b.score);
      const slice = arr.slice(start, stop + 1);
      return slice.flatMap((e) => [e.member, e.score]);
    },
  };
}

function runContract(name: string, makeStore: () => RateLimitStore) {
  describe(`RateLimitStore contract — ${name}`, () => {
    it('allows exactly maxRequests, then blocks', async () => {
      const store = makeStore();
      const id = `c-${name}-${Date.now()}`;
      const max = 3;
      const windowMs = 10_000;

      for (let i = 0; i < max; i++) {
        const r = await store.check(id, windowMs, max);
        expect(r.allowed).toBe(true);
      }
      const blocked = await store.check(id, windowMs, max);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('reports decreasing remaining capacity', async () => {
      const store = makeStore();
      const id = `rem-${name}-${Date.now()}`;
      const first = await store.check(id, 10_000, 5);
      const second = await store.check(id, 10_000, 5);
      expect(first.remaining).toBe(4);
      expect(second.remaining).toBe(3);
    });

    it('isolates distinct identifiers', async () => {
      const store = makeStore();
      const a = await store.check(`a-${name}-${Date.now()}`, 10_000, 1);
      const b = await store.check(`b-${name}-${Date.now()}`, 10_000, 1);
      expect(a.allowed).toBe(true);
      expect(b.allowed).toBe(true);
    });
  });
}

runContract('memory', () => new MemoryRateLimitStore());
runContract('redis(fake)', () => new RedisRateLimitStore(makeFakeRedis()));
