import { describe, it, expect, jest } from "bun:test"
import { createEthGetNFTsTool } from "./getNFTs"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("eth_getNFTs", () => {
  it("returns NFT list for valid address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetNFTsTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK", result: [{ contractAddress: "0xabc", tokenID: "1", tokenName: "TestNFT", tokenSymbol: "TNFT", tokenURI: "https://example.com/1" }] }), { status: 200 })
    )
    const result = await tool.execute({ address: "0x742d35Cc6634C0532925a3b844Bc4a1b4f8c1b5e" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[]).length).toBe(1)
    expect((result.data as any[])[0].tokenId).toBe("1")
    mockFetch.mockRestore()
  })

  it("returns error for invalid address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetNFTsTool(provider, cache)
    const result = await tool.execute({ address: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
