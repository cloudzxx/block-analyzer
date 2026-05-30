import { describe, it, expect, jest } from "bun:test"
import { createEthGetTopHoldersTool } from "./getTopHolders"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("eth_getTopHolders", () => {
  it("returns top holders for valid contract", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetTopHoldersTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK", result: [{ HolderAddress: "0xabc", tokenHolderBalance: "1000000" }] }), { status: 200 })
    )
    const result = await tool.execute({ contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[]).length).toBe(1)
    expect((result.data as any[])[0].address).toBe("0xabc")
    mockFetch.mockRestore()
  })

  it("returns error for invalid contract", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetTopHoldersTool(provider, cache)
    const result = await tool.execute({ contractAddress: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
