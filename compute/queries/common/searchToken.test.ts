import { describe, it, expect, jest } from "bun:test"
import { createSearchTokenTool } from "./searchToken"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("searchToken", () => {
  it("returns search results for query", async () => {
    const cache = createCache()
    const tool = createSearchTokenTool(cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ coins: [{ id: "usd-coin", name: "USD Coin", symbol: "USDC", thumb: "https://example.com/usdc.png" }] }), { status: 200 })
    )
    const result = await tool.execute({ query: "USDC" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[]).length).toBe(1)
    expect((result.data as any[])[0].symbol).toBe("USDC")
    mockFetch.mockRestore()
  })

  it("returns error for empty query", async () => {
    const cache = createCache()
    const tool = createSearchTokenTool(cache)
    const result = await tool.execute({ query: "" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
