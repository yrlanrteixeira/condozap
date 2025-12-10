/**
 * Simple In-Memory Cache (DRY)
 * 
 * Basic caching for data that changes infrequently.
 * No Redis dependency - keep it simple.
 * 
 * WHY:
 * - DRY: One cache implementation used everywhere
 * - Simple: No external dependencies
 * - Type-safe: Generic class with proper typing
 * 
 * USE CASES:
 * - Condominiums list (changes rarely)
 * - Structure data (towers, floors - changes rarely)
 * - Config values
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number; // in milliseconds

  constructor(defaultTTLSeconds: number = 300) { // 5 minutes default
    this.defaultTTL = defaultTTLSeconds * 1000;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value as T;
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Optional TTL in seconds (overrides default)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Get or set pattern - fetch from cache or execute getter and cache result
   * 
   * Usage:
   *   const condos = await cache.getOrSet(
   *     "condominiums:all",
   *     () => db.findAllCondominiums(),
   *     600 // 10 minutes TTL
   *   );
   */
  async getOrSet<T>(key: string, getter: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await getter();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   * Example: invalidatePattern("condominiums:") deletes condominiums:all, condominiums:123, etc.
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================
// Singleton instance (global cache)
// ============================================

export const appCache = new InMemoryCache(300); // 5 minutes default TTL

// ============================================
// Cache key generators (consistency)
// ============================================

export const CacheKeys = {
  condominiums: {
    all: () => "condominiums:all",
    byId: (id: string) => `condominiums:${id}`,
    structure: (id: string) => `condominiums:${id}:structure`,
  },
  residents: {
    byCondominium: (condoId: string) => `residents:condo:${condoId}`,
  },
};
