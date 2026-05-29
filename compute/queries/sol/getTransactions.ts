import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "../../../ingest/adapters/solscan"
import type { Cache } from "../../../storage/cache/lru"
import { isSolanaAddress } from "../../../packages/shared/chain"

export function createSolGetTransactionsTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getTransactions",
    description: "Query recent transactions for a Solana address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Solana address (base58)" },
        limit: { type: "number", description: "Max number (default 10, max 50)" },
      },
      required: ["address"],
    },
    cacheTTL: 60_000,

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const address = args.address as string
      const limit = Math.min(Number(args.limit) || 10, 40)
      if (!address || !isSolanaAddress(address)) {
        return { success: false, error: "Invalid Solana address format" }
      }
      try {
        const cacheKey = `sol:txs:${address}:${limit}`
        const raw = await cache.getOrSet(cacheKey, () =>
          provider.request<unknown[]>({
            module: "account", action: "transactions", address, limit: String(limit),
          }),
          (this as Tool).cacheTTL!,
        )
        const transactions = (raw as any[])?.map((tx: any) => ({
          txHash: tx.txHash, blockTime: tx.blockTime, slot: tx.blockId ?? tx.slot,
          fee: tx.fee, status: tx.status, signer: tx.signer,
        })) || []
        return { success: true, data: transactions }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
