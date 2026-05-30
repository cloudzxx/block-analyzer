import { describe, it, expect, jest } from "bun:test"
import { createEthGetTokenTransfersTool } from "./getTokenTransfers"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("eth_getTokenTransfers", () => {
  it("returns token transfers for valid address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetTokenTransfersTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK", result: [{ hash: "0xabc", tokenName: "USDC", tokenSymbol: "USDC", tokenDecimal: "6", from: "0xfrom", to: "0xto", value: "1000000", timeStamp: "1700000000", contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }] }), { status: 200 })
    )
    const result = await tool.execute({ address: "0x742d35Cc6634C0532925a3b844Bc4a1b4f8c1b5e" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[]).length).toBe(1)
    expect((result.data as any[])[0].tokenSymbol).toBe("USDC")
    mockFetch.mockRestore()
  })

  it("returns error for invalid address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetTokenTransfersTool(provider, cache)
    const result = await tool.execute({ address: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
