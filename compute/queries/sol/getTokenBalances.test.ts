import { describe, it, expect, jest } from "bun:test"
import { createSolGetTokenBalancesTool } from "./getTokenBalances"
import { SolscanProvider } from "@ingest/adapters/solscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("sol_getTokenBalances", () => {
  it("returns token balances for valid address", async () => {
    const provider = new SolscanProvider("sol-key")
    const cache = createCache()
    const tool = createSolGetTokenBalancesTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [{ token_account: "abc", token_address: "So11111111111111111111111111111111111111112", amount: 1000000000, token_decimals: 9, owner: "7Ec..." }] }), { status: 200 })
    )
    const result = await tool.execute({ address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuKvCKBHfFJb1A" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[]).length).toBe(1)
    expect((result.data as any[])[0].mint).toBe("So11111111111111111111111111111111111111112")
    expect((result.data as any[])[0].amount).toBe(1000000000)
    mockFetch.mockRestore()
  })

  it("returns error for invalid address", async () => {
    const provider = new SolscanProvider("sol-key")
    const cache = createCache()
    const tool = createSolGetTokenBalancesTool(provider, cache)
    const result = await tool.execute({ address: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
