import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "../../providers/solscan"
import type { Cache } from "../../cache/lru"
import { isSolanaAddress } from "../../shared/chain"

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
            address?: string
            lamports?: number
            owner?: string
            executable?: boolean
            rentEpoch?: number
            type?: string
            tokenInfo?: Record<string, unknown>
          }>({ module: "account", action: "info", address })
          return {
            address: info.address || address,
            lamports: info.lamports || 0,
            solBalance: ((info.lamports || 0) / 1e9).toFixed(6),
            owner: info.owner || "",
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
