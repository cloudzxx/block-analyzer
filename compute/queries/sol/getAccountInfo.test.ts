import { describe, it, expect, jest } from "bun:test"
import { createSolGetAccountInfoTool } from "./getAccountInfo"
import { SolscanProvider } from "@ingest/adapters/solscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("sol_getAccountInfo", () => {
  it("returns account info for valid address", async () => {
    const provider = new SolscanProvider("sol-key")
    const cache = createCache()
    const tool = createSolGetAccountInfoTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { account: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuKvCKBHfFJb1A", lamports: 1000000000, owner_program: "So11111111111111111111111111111111111111112", executable: false, rent_epoch: 0, type: "account", is_oncurve: 1 } }), { status: 200 })
    )
    const result = await tool.execute({ address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuKvCKBHfFJb1A" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).solBalance).toBe("1.000000")
    expect((result.data as any).owner).toBe("So11111111111111111111111111111111111111112")
    mockFetch.mockRestore()
  })

  it("returns error for invalid address", async () => {
    const provider = new SolscanProvider("sol-key")
    const cache = createCache()
    const tool = createSolGetAccountInfoTool(provider, cache)
    const result = await tool.execute({ address: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
