import { describe, it, expect, jest } from "bun:test"
import { createEthGetGasPriceTool } from "./getGasPrice"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("eth_getGasPrice", () => {
  it("returns gas prices from oracle", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetGasPriceTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK", result: { SafeGasPrice: "10", ProposeGasPrice: "15", FastGasPrice: "20", suggestBaseFee: "9.5" } }), { status: 200 })
    )
    const result = await tool.execute({}, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).safe).toBe("10")
    expect((result.data as any).fast).toBe("20")
    mockFetch.mockRestore()
  })
})
