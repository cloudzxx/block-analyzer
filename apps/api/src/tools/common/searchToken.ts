import type { Tool, ToolContext, ToolResult } from "../types"
import type { Cache } from "../../cache/lru"

export function createSearchTokenTool(cache: Cache): Tool {
  return {
    name: "searchToken",
    description: "Fuzzy search for a token by name or symbol across Ethereum and Solana. Returns matching token info including symbol, name, and chain.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Token name or symbol to search (e.g. USDC, Uniswap)" },
      },
      required: ["query"],
    },
    cacheTTL: 300_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const query = args.query as string
      if (!query?.trim()) {
        return { success: false, error: "Search query is required" }
      }
      try {
        const cacheKey = `tokenSearch:${query.toLowerCase().trim()}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query.trim())}`
          )
          if (!res.ok) throw new Error(`Token search failed: ${res.status}`)
          const json = await res.json() as { coins: Array<{ id: string; name: string; symbol: string; thumb: string; api_symbol?: string }> }
          return (json.coins || []).slice(0, 20).map((c) => ({
            id: c.id,
            name: c.name,
            symbol: (c.symbol || c.api_symbol || "").toUpperCase(),
            chain: "ethereum",
            logo: c.thumb || "",
          }))
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
