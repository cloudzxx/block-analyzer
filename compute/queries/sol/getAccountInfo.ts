import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "../../../ingest/adapters/solscan"
import type { Cache } from "../../../storage/cache/lru"
import { isSolanaAddress } from "../../../packages/shared/chain"

export function createSolGetAccountInfoTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getAccountInfo",
    description: "Get detailed account information for a Solana address including balance, owner, executable status, and rent epoch.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Solana address" },
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
        const cacheKey = `sol:accountInfo:${address}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const info = await provider.request<{
            account?: string
            lamports?: number
            ownerProgram?: string
            executable?: boolean
            rentEpoch?: number
            type?: string
            isOncurve?: number
          }>({ module: "account", action: "info", address })
          return {
            address: info.account || address,
            lamports: info.lamports || 0,
            solBalance: ((info.lamports || 0) / 1e9).toFixed(6),
            owner: info.ownerProgram || "",
            executable: info.executable || false,
            type: info.type || "unknown",
            rentEpoch: info.rentEpoch || 0,
          }
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
