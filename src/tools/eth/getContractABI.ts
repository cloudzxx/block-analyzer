import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "../../providers/etherscan"
import type { Cache } from "../../cache/lru"
import { isEthereumAddress } from "../../shared/chain"

export function createEthGetContractABITool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getContractABI",
    description: "Get the ABI of a verified Ethereum contract by its address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum contract address (0x...)" },
      },
      required: ["address"],
    },
    cacheTTL: 300_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const address = args.address as string
      if (!address || !isEthereumAddress(address)) {
        return { success: false, error: "Invalid Ethereum address format" }
      }
      try {
        const cacheKey = `eth:abi:${address.toLowerCase()}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const abi = await provider.request<string>({
            module: "contract", action: "getabi", address,
          })
          return { address, abi: JSON.parse(abi) }
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
