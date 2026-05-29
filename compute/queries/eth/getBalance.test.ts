import { describe, it, expect, jest } from "bun:test"
import { createEthGetBalanceTool } from "./getBalance"
import { EtherscanProvider } from "../../../ingest/adapters/etherscan"
import { createCache } from "../../../storage/cache/lru"
import type { Config } from "../../../packages/shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("eth_getBalance", () => {
  it("returns balance for valid Ethereum address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetBalanceTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK", result: "1000000000000000000" }), { status: 200 })
    )
    const result = await tool.execute({ address: "0x742d35Cc6634C0532925a3b844b5d0f1c0a4c1e0" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).balanceWei).toBe("1000000000000000000")
    mockFetch.mockRestore()
  })

  it("returns error for invalid address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetBalanceTool(provider, cache)
    const result = await tool.execute({ address: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
