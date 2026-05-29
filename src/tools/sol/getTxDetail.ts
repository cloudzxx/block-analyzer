import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "../../providers/solscan"
import type { Cache } from "../../cache/lru"

export function createSolGetTxDetailTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getTxDetail",
    description: "Query detailed information about a specific Solana transaction by its signature.",
    parameters: {
      type: "object",
      properties: { signature: { type: "string", description: "Transaction signature (base58)" } },
      required: ["signature"],
    },
    cacheTTL: Infinity,

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const signature = args.signature as string
      if (!signature || signature.length < 32) {
        return { success: false, error: "Invalid transaction signature" }
      }
      try {
        const cacheKey = `sol:tx:${signature}`
        const raw = await cache.getOrSet(cacheKey, () =>
          provider.request<Record<string, unknown>>({
            module: "transaction", action: "detail", signature,
          }),
          Infinity,
        )
        const tx = raw as Record<string, unknown>
        return { success: true, data: { txHash: tx.txHash, blockTime: tx.blockTime, slot: tx.blockId ?? tx.slot, fee: tx.fee, signer: tx.signer, status: tx.status } }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
