import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "../../providers/etherscan"
import type { Cache } from "../../cache/lru"

export function createEthGetGasPriceTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getGasPrice",
    description: "Get current Ethereum gas prices from the Gas Oracle. Returns Safe, Propose, and Fast gas prices in Gwei.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    cacheTTL: 30_000,

    async execute(_args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      try {
        const data = await cache.getOrSet("eth:gasPrice", async () => {
          const result = await provider.request<{
            SafeGasPrice: string
            ProposeGasPrice: string
            FastGasPrice: string
            suggestBaseFee: string
          }>({ module: "gastracker", action: "gasoracle" })
          return {
            safe: result.SafeGasPrice,
            propose: result.ProposeGasPrice,
            fast: result.FastGasPrice,
            baseFee: result.suggestBaseFee,
            unit: "Gwei",
          }
        }, 30_000)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
