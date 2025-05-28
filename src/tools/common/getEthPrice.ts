import type { Tool, ToolContext, ToolResult } from "../types"
import type { CoinGeckoProvider } from "../../providers/coingecko"
import type { Cache } from "../../cache/lru"

export function createGetEthPriceTool(coingecko: CoinGeckoProvider, cache: Cache): Tool {
  return {
    name: "getEthPrice",
    description: "Get the current USD price of Ethereum (ETH) and Solana (SOL).",
    parameters: { type: "object", properties: {}, required: [] },
    cacheTTL: 30_000,

    async execute(): Promise<ToolResult> {
      try {
        const prices = await coingecko.getPrices()
        return { success: true, data: prices }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
