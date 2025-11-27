import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "../../providers/solscan"
import type { Cache } from "../../cache/lru"
import { isSolanaAddress } from "../../shared/chain"

export function createSolGetTokenTransfersTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getTokenTransfers",
    description: "Query SPL token transfer activity for a Solana address. Fetches recent token-related transactions.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Solana address" },
        limit: { type: "number", description: "Number of records (default: 20, max: 100)" },
      },
      required: ["address"],
    },
    cacheTTL: 60_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const address = args.address as string
      if (!address || !isSolanaAddress(address)) {
        return { success: false, error: "Invalid Solana address format" }
      }
      try {
        const cacheKey = `sol:tokenTx:${address}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const txs = await provider.request<Array<{
            txHash?: string
            blockTime?: number
            signer?: string
            tokenTransfers?: Array<{
              from: string; to: string; tokenAddress: string
              tokenName?: string; tokenSymbol?: string; amount?: number
            }>
          }>>({ module: "account", action: "transactions", address, limit: String(Math.min(args.limit as number || 20, 100)) })

          return txs
            .filter((tx) => tx.tokenTransfers && tx.tokenTransfers.length > 0)
            .flatMap((tx) =>
              (tx.tokenTransfers || []).map((tt) => ({
                txHash: tx.txHash,
                blockTime: tx.blockTime,
                signer: tx.signer,
                from: tt.from,
                to: tt.to,
                tokenAddress: tt.tokenAddress,
                tokenName: tt.tokenName || "",
                tokenSymbol: tt.tokenSymbol || "",
                amount: tt.amount || 0,
              }))
            )
            .slice(0, Math.min(args.limit as number || 20, 100))
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
