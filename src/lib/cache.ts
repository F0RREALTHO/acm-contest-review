/**
 * In-memory stats cache with TTL and manual invalidation.
 * Used for expensive aggregations that don't change between syncs.
 * Invalidated on sync completion.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class StatsCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get or compute: returns cached value if available, otherwise
   * computes it using the provided function and caches the result.
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const data = await compute();
    this.set(key, data, ttl);
    return data;
  }
}

// Global singleton
const globalForCache = globalThis as unknown as {
  statsCache: StatsCache | undefined;
};

export const statsCache = globalForCache.statsCache ?? new StatsCache();

if (process.env.NODE_ENV !== "production") {
  globalForCache.statsCache = statsCache;
}
