import { describe, it, expect, jest } from "bun:test"
import { createEthGetContractABITool } from "./getContractABI"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("eth_getContractABI", () => {
  it("returns ABI for valid contract address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetContractABITool(provider, cache)
    const mockAbi = [{ name: "balanceOf", type: "function", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] }]
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK", result: JSON.stringify(mockAbi) }), { status: 200 })
    )
    const result = await tool.execute({ address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).abi).toEqual(mockAbi)
    mockFetch.mockRestore()
  })

  it("returns error for invalid address", async () => {
    const provider = new EtherscanProvider("eth-key")
    const cache = createCache()
    const tool = createEthGetContractABITool(provider, cache)
    const result = await tool.execute({ address: "bad" }, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
  })
})
