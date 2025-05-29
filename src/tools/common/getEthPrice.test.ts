import { describe, it, expect, jest } from "bun:test"
import { createGetEthPriceTool } from "./getEthPrice"
import { CoinGeckoProvider } from "../../providers/coingecko"
import { createCache } from "../../cache/lru"
import type { Config } from "../../shared/config"

function mc(): Config { return { OPENAI_API_KEY:"s",OPENAI_MODEL:"m",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3000,FRONTEND_ORIGIN:"h"} }

describe("getEthPrice", () => {
  it("returns ETH and SOL prices", async () => {
    const coingecko = new CoinGeckoProvider()
    const cache = createCache()
    const tool = createGetEthPriceTool(coingecko, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ethereum: { usd: 3500.42 }, solana: { usd: 180.15 } }), { status: 200 })
    )
    const result = await tool.execute({}, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).ethereum).toBe(3500.42)
    mockFetch.mockRestore()
  })
})
