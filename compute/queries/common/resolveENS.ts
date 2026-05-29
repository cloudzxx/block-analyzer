import type { Tool, ToolContext, ToolResult } from "../types"
import type { Cache } from "../../../storage/cache/lru"

export function createResolveENSTool(cache: Cache): Tool {
  return {
    name: "resolveENS",
    description: "Resolve an ENS name (.eth) to its Ethereum address, or reverse-resolve an address to its ENS name.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "ENS name to resolve (e.g. vitalik.eth)" },
        address: { type: "string", description: "Ethereum address to reverse-resolve (0x...)" },
      },
      oneOf: [{ required: ["name"] }, { required: ["address"] }],
    },
    cacheTTL: 300_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const name = args.name as string | undefined
      const address = args.address as string | undefined

      try {
        if (name) {
          const cacheKey = `ens:resolve:${name.toLowerCase()}`
          const data = await cache.getOrSet(cacheKey, async () => {
            const res = await fetch(
              `https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`
            )
            if (!res.ok) throw new Error(`ENS resolution failed: ${res.status}`)
            const json = await res.json() as { address?: string; displayName?: string }
            return { name, address: json.address || null, displayName: json.displayName || null }
          }, this.cacheTTL!)
          return { success: true, data }
        }

        if (address) {
          const cacheKey = `ens:reverse:${address.toLowerCase()}`
          const data = await cache.getOrSet(cacheKey, async () => {
            const res = await fetch(
              `https://api.ensideas.com/ens/resolve/${encodeURIComponent(address)}`
            )
            if (!res.ok) throw new Error(`ENS reverse resolution failed: ${res.status}`)
            const json = await res.json() as { address?: string; displayName?: string }
            return { address, name: json.displayName || null }
          }, this.cacheTTL!)
          return { success: true, data }
        }

        return { success: false, error: "Provide either a name (e.g. vitalik.eth) or an address to resolve" }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
