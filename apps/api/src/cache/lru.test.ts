import { describe, it, expect, beforeEach } from "bun:test"
import { createCache } from "./lru"

describe("createCache", () => {
  let cache: ReturnType<typeof createCache>

  beforeEach(() => {
    cache = createCache()
  })

  it("returns cached value if not expired", () => {
    cache.set("key1", "value1", 5000)
    expect(cache.get<string>("key1")).toBe("value1")
  })

  it("returns undefined for missing key", () => {
    expect(cache.get("nonexistent")).toBeUndefined()
  })

  it("respects TTL — expires after specified ms", async () => {
    cache.set("key2", "value2", 10)
    await new Promise(r => setTimeout(r, 20))
    expect(cache.get("key2")).toBeUndefined()
  })

  it("deletes a key explicitly", () => {
    cache.set("k", "v", 5000)
    cache.del("k")
    expect(cache.get("k")).toBeUndefined()
  })

  it("clears all entries", () => {
    cache.set("a", 1, 5000)
    cache.set("b", 2, 5000)
    cache.clear()
    expect(cache.get("a")).toBeUndefined()
    expect(cache.get("b")).toBeUndefined()
  })

  it("getOrSet fetches value on miss", () => {
    const fn = () => "computed"
    expect(cache.getOrSet<string>("miss", fn, 5000)).toBe("computed")
    expect(cache.get<string>("miss")).toBe("computed")
  })
})
