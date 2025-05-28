import { LRUCache } from "lru-cache"

interface CacheEntry {
  value: unknown
  expiresAt: number
}

export function createCache(maxSize: number = 1000) {
  const store = new LRUCache<string, CacheEntry>({ max: maxSize })

  function set(key: string, value: unknown, ttlMs: number): void {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  function get<T = unknown>(key: string): T | undefined {
    const entry = store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  function del(key: string): void {
    store.delete(key)
  }

  function clear(): void {
    store.clear()
  }

  function getOrSet<T>(key: string, fn: () => T, ttlMs: number): T {
    const cached = get<T>(key)
    if (cached !== undefined) return cached
    const value = fn()
    set(key, value, ttlMs)
    return value
  }

  return { set, get, del, clear, getOrSet, size: () => store.size }
}

export type Cache = ReturnType<typeof createCache>
