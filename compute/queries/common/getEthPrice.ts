import type { Tool, ToolContext, ToolResult } from "../types"
import type { CoinGeckoProvider } from "@ingest/adapters/coingecko"
import type { Cache } from "@storage/cache/lru"

// ETH/SOL 价格查询工具：调用 CoinGecko API，30s 缓存
export function createGetEthPriceTool(coingecko: CoinGeckoProvider, cache: Cache): Tool {
  return {
    name: "getEthPrice",
    description: "Get the current USD price of Ethereum (ETH) and Solana (SOL).",
    parameters: { type: "object", properties: {}, required: [] },
    cacheTTL: 30_000, // 价格 30 秒内不重复请求

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
