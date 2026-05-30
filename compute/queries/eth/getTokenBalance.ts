import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "@ingest/adapters/etherscan"
import type { Cache } from "@storage/cache/lru"
import { isEthereumAddress } from "@shared/chain"

export function createEthGetTokenBalanceTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getTokenBalance",
    description: "Query the ERC-20 token balance for an address. Requires contract address and wallet address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum wallet address (0x...)" },
        contractAddress: { type: "string", description: "ERC-20 token contract address (0x...)" },
      },
      required: ["address", "contractAddress"],
    },
    cacheTTL: 15_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const address = args.address as string
      const contractAddress = args.contractAddress as string
      if (!address || !isEthereumAddress(address)) {
        return { success: false, error: "Invalid Ethereum address format" }
      }
      if (!contractAddress || !isEthereumAddress(contractAddress)) {
        return { success: false, error: "Invalid token contract address format" }
      }
      try {
        const cacheKey = `eth:tokenBalance:${address.toLowerCase()}:${contractAddress.toLowerCase()}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const balance = await provider.request<string>({
            module: "account", action: "tokenbalance",
            contractaddress: contractAddress, address, tag: "latest",
          })
          return { contractAddress, balance, rawBalance: balance }
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
