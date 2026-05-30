import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "@ingest/adapters/solscan"
import type { Cache } from "@storage/cache/lru"
import { isSolanaAddress } from "@shared/chain"

interface TransferItem {
  transId?: string
  blockTime?: number
  fromAddress?: string
  toAddress?: string
  tokenAddress?: string
  tokenDecimals?: number
  amount?: number
  flow?: string
  activityType?: string
}

export function createSolGetTokenTransfersTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getTokenTransfers",
    description: "Query SPL token transfer activity for a Solana address. Uses Pro API /account/transfer endpoint.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Solana address" },
        limit: { type: "number", description: "Number of records (default: 20, max: 40)" },
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
          const items = await provider.request<TransferItem[]>({
            module: "account", action: "transfer", address,
            limit: String(Math.min(Number(args.limit) || 20, 40)),
          })
          return (items || []).map((t) => ({
            txHash: t.transId || "",
            blockTime: t.blockTime || 0,
            from: t.fromAddress || "",
            to: t.toAddress || "",
            tokenAddress: t.tokenAddress || "",
            amount: t.amount ?? 0,
            decimals: t.tokenDecimals ?? 0,
            flow: t.flow || "",
          }))
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
