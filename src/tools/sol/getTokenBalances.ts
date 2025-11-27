import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "../../providers/solscan"
import type { Cache } from "../../cache/lru"
import { isSolanaAddress } from "../../shared/chain"

export function createSolGetTokenBalancesTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getTokenBalances",
    description: "Query all SPL token balances for a Solana address. Returns token name, symbol, amount, and mint address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Solana address" },
      },
      required: ["address"],
    },
    cacheTTL: 15_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const address = args.address as string
      if (!address || !isSolanaAddress(address)) {
        return { success: false, error: "Invalid Solana address format" }
      }
      try {
        const cacheKey = `sol:tokens:${address}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const tokens = await provider.request<Array<{
            tokenAddress?: string
            tokenName?: string
            tokenSymbol?: string
            tokenAmount?: { amount: string; decimals: number; uiAmount: number }
            tokenAccount?: string
          }>>({ module: "account", action: "tokens", address })
          return tokens.map((t) => ({
            mint: t.tokenAddress || "",
            name: t.tokenName || "",
            symbol: t.tokenSymbol || "",
            amount: t.tokenAmount?.uiAmount ?? 0,
            rawAmount: t.tokenAmount?.amount || "0",
            decimals: t.tokenAmount?.decimals ?? 0,
            tokenAccount: t.tokenAccount || "",
          }))
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
