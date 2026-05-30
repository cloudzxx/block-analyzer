import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "@ingest/adapters/etherscan"
import type { Cache } from "@storage/cache/lru"
import { isEthereumAddress } from "@shared/chain"

export function createEthGetTopHoldersTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getTopHolders",
    description: "Get the top holders of an ERC-20 token by contract address. Returns addresses and their balances.",
    parameters: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "ERC-20 token contract address (0x...)" },
        page: { type: "number", description: "Page number (default: 1)" },
        offset: { type: "number", description: "Records per page (default: 50, max: 100)" },
      },
      required: ["contractAddress"],
    },
    cacheTTL: 60_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const contractAddress = args.contractAddress as string
      if (!contractAddress || !isEthereumAddress(contractAddress)) {
        return { success: false, error: "Invalid token contract address format" }
      }
      try {
        const cacheKey = `eth:topHolders:${contractAddress.toLowerCase()}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const holders = await provider.request<Array<{
            HolderAddress: string
            tokenHolderBalance: string
          }>>({
            module: "token", action: "tokenholderlist",
            contractaddress: contractAddress,
            page: String(args.page || 1),
            offset: String(Math.min(args.offset as number || 50, 100)),
          })
          return holders.map((h) => ({
            address: h.HolderAddress,
            balance: h.tokenHolderBalance,
          }))
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
