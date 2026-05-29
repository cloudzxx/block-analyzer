import { LRUCache } from "lru-cache"

// 缓存条目：包含值和过期时间戳
interface CacheEntry {
  value: unknown
  expiresAt: number
}

// 创建 LRU 缓存（带 TTL 自动过期）
// 使用 lru-cache 库，包装为 get/set/del/clear/getOrSet 接口
export function createCache(maxSize: number = 1000) {
  const store = new LRUCache<string, CacheEntry>({ max: maxSize })

  function set(key: string, value: unknown, ttlMs: number): void {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  function get<T = unknown>(key: string): T | undefined {
    const entry = store.get(key)
    if (!entry) return undefined
    // 惰性过期：读取时检查 TTL
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

  // getOrSet：缓存穿透时自动执行回调并写入缓存
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
