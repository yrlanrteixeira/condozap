import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CacheKeys, InMemoryCache } from "./cache";

describe("InMemoryCache", () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new InMemoryCache(60); // 60s default
  });

  afterEach(() => {
    cache.clear();
    vi.useRealTimers();
  });

  it("get returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("set + get returns the stored value", () => {
    cache.set("k", { a: 1 });
    expect(cache.get<{ a: number }>("k")).toEqual({ a: 1 });
  });

  it("respects TTL and evicts expired entries on read", () => {
    cache.set("k", "v", 1); // 1 second
    expect(cache.get("k")).toBe("v");
    vi.advanceTimersByTime(1500);
    expect(cache.get("k")).toBeUndefined();
  });

  it("uses default TTL when ttl not provided", () => {
    cache.set("k", "v");
    vi.advanceTimersByTime(30_000);
    expect(cache.get("k")).toBe("v");
    vi.advanceTimersByTime(31_000);
    expect(cache.get("k")).toBeUndefined();
  });

  it("delete removes a specific key", () => {
    cache.set("k", 1);
    expect(cache.delete("k")).toBe(true);
    expect(cache.get("k")).toBeUndefined();
    expect(cache.delete("k")).toBe(false);
  });

  it("invalidatePattern removes matching keys only", () => {
    cache.set("a:1", 1);
    cache.set("a:2", 2);
    cache.set("b:1", 3);
    const count = cache.invalidatePattern("a:");
    expect(count).toBe(2);
    expect(cache.get("a:1")).toBeUndefined();
    expect(cache.get("b:1")).toBe(3);
  });

  it("clear empties the cache", () => {
    cache.set("k", 1);
    cache.clear();
    expect(cache.stats().size).toBe(0);
  });

  it("stats reports size and keys", () => {
    cache.set("k1", 1);
    cache.set("k2", 2);
    const s = cache.stats();
    expect(s.size).toBe(2);
    expect(s.keys.sort()).toEqual(["k1", "k2"]);
  });

  describe("getOrSet", () => {
    it("returns cached value and does not call getter", async () => {
      cache.set("k", 42);
      const getter = vi.fn().mockResolvedValue(100);
      const v = await cache.getOrSet("k", getter);
      expect(v).toBe(42);
      expect(getter).not.toHaveBeenCalled();
    });

    it("calls getter and caches result on miss", async () => {
      const getter = vi.fn().mockResolvedValue("fresh");
      const v = await cache.getOrSet("k", getter);
      expect(v).toBe("fresh");
      expect(getter).toHaveBeenCalledOnce();
      expect(cache.get("k")).toBe("fresh");
    });

    it("honors the per-call ttl", async () => {
      await cache.getOrSet("k", async () => "v", 1);
      vi.advanceTimersByTime(2000);
      expect(cache.get("k")).toBeUndefined();
    });
  });

  it("cleanup runs on the internal interval and clears expired entries", () => {
    cache.set("k", "v", 1);
    vi.advanceTimersByTime(2000);
    // Trigger internal cleanup (runs every 60s)
    vi.advanceTimersByTime(61_000);
    // Directly verify via stats - expired entry should be gone
    expect(cache.stats().keys).not.toContain("k");
  });
});

describe("CacheKeys", () => {
  it("builds stable keys for condominiums and residents", () => {
    expect(CacheKeys.condominiums.all()).toBe("condominiums:all");
    expect(CacheKeys.condominiums.byId("abc")).toBe("condominiums:abc");
    expect(CacheKeys.condominiums.structure("abc")).toBe(
      "condominiums:abc:structure"
    );
    expect(CacheKeys.residents.byCondominium("xyz")).toBe(
      "residents:condo:xyz"
    );
  });
});
