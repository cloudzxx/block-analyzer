import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "@ingest/adapters/solscan"
import type { Cache } from "@storage/cache/lru"
import { isSolanaAddress } from "@shared/chain"

export function createSolGetBalanceTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getBalance",
    description: "Query the SOL balance of a Solana address.",
    parameters: {
      type: "object",
      properties: { address: { type: "string", description: "Solana address (base58)" } },
      required: ["address"],
    },
    cacheTTL: 15_000,

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const address = args.address as string
      if (!address || !isSolanaAddress(address)) {
        return { success: false, error: "Invalid Solana address format" }
      }
      try {
        const cacheKey = `sol:balance:${address}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const res = await provider.request<{ lamports: number }>({
            module: "account", action: "info", address,
          })
          const lamports = res.lamports || 0
          return { lamports, sol: (Number(lamports) / 1e9).toString() }
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
