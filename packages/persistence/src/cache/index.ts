/**
 * Cache layer. Upstash Redis client. See architecture §7.5.
 *
 * Used for:
 *   - Ability catalog cache (60s TTL; hot key sub-millisecond)
 *   - Yjs-snapshot debounce set (a "dirty plan" set with a 5s TTL)
 *   - Rate-limit counters
 */
import { Redis } from '@upstash/redis';

export const createRedisClient = (url: string, token: string): Redis => {
  return new Redis({ url, token });
};

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expireAt(key: string, unixSeconds: number): Promise<void>;
}

export const upstashCache = (redis: Redis): CacheClient => ({
  get: async <T>(key: string) => (await redis.get<T>(key)) ?? null,
  set: async <T>(key: string, value: T, ttlSeconds?: number) => {
    if (ttlSeconds != null) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  },
  sadd: async (key, member) => {
    await redis.sadd(key, member);
  },
  srem: async (key, member) => {
    await redis.srem(key, member);
  },
  smembers: async (key) => redis.smembers(key),
  expire: async (key, ttlSeconds) => {
    await redis.expire(key, ttlSeconds);
  },
  del: async (key) => {
    await redis.del(key);
  },
  incr: async (key) => redis.incr(key),
  expireAt: async (key, unixSeconds) => {
    await redis.expireat(key, unixSeconds);
  },
});

/** In-memory cache for tests and local dev. */
export const inMemoryCache = (): CacheClient => {
  const store = new Map<string, { value: unknown; expiresAt: number | null }>();
  return {
    get: async <T>(key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt != null && entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    set: async <T>(key: string, value: T, ttlSeconds?: number) => {
      store.set(key, {
        value,
        expiresAt: ttlSeconds != null ? Date.now() + ttlSeconds * 1000 : null,
      });
    },
    sadd: async (key, member) => {
      const set = new Set<string>((store.get(key)?.value as string[] | undefined) ?? []);
      set.add(member);
      store.set(key, { value: [...set], expiresAt: null });
    },
    srem: async (key, member) => {
      const set = new Set<string>((store.get(key)?.value as string[] | undefined) ?? []);
      set.delete(member);
      store.set(key, { value: [...set], expiresAt: null });
    },
    smembers: async (key) => (store.get(key)?.value as string[] | undefined) ?? [],
    expire: async () => undefined,
    del: async (key) => {
      store.delete(key);
    },
    incr: async (key) => {
      const before = (store.get(key)?.value as number | undefined) ?? 0;
      const next = before + 1;
      store.set(key, { value: next, expiresAt: null });
      return next;
    },
    expireAt: async () => undefined,
  };
};
