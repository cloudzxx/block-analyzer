import { describe, it, expect, jest } from "bun:test"
import { createEthGetTokenBalanceTool } from "./getTokenBalance"
import { EtherscanProvider } from "../../providers/etherscan"
import { createCache } from "../../cache/lru"
import type { Config } from "../../shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("eth_getTokenBalance", () => {
  it("returns token balance for valid address + contract", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetTokenBalanceTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK", result: "1000000000000000000" }), { status: 200 })
    )
    const result = await tool.execute({
      address: "0x742d35Cc6634C0532925a3b844Bc4a1b4f8c1b5e",
      contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).balance).toBe("1000000000000000000")
    mockFetch.mockRestore()
  })

  it("returns error for invalid address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetTokenBalanceTool(provider, cache)
    const result = await tool.execute({ address: "bad", contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })

  it("returns error for invalid contract address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetTokenBalanceTool(provider, cache)
    const result = await tool.execute({ address: "0x742d35Cc6634C0532925a3b844Bc4a1b4f8c1b5e", contractAddress: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
