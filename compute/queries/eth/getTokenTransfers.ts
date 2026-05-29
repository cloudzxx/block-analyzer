import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "../../../ingest/adapters/etherscan"
import type { Cache } from "../../../storage/cache/lru"
import { isEthereumAddress } from "../../../packages/shared/chain"

export function createEthGetTokenTransfersTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getTokenTransfers",
    description: "Query ERC-20 token transfer history for an address. Returns recent token transfers with details.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (0x...)" },
        contractAddress: { type: "string", description: "Optional: filter by token contract address" },
        page: { type: "number", description: "Page number (default: 1)" },
        offset: { type: "number", description: "Records per page (default: 50, max: 100)" },
      },
      required: ["address"],
    },
    cacheTTL: 60_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const address = args.address as string
      if (!address || !isEthereumAddress(address)) {
        return { success: false, error: "Invalid Ethereum address format" }
      }
      const contractAddress = args.contractAddress as string | undefined
      if (contractAddress && !isEthereumAddress(contractAddress)) {
        return { success: false, error: "Invalid token contract address format" }
      }
      try {
        const cacheKey = `eth:tokenTransfers:${address.toLowerCase()}${contractAddress ? ":" + contractAddress.toLowerCase() : ""}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const params: Record<string, string> = {
            module: "account", action: "tokentx",
            address, page: String(args.page || 1),
            offset: String(Math.min(args.offset as number || 50, 100)),
            startblock: "0", endblock: "99999999", sort: "desc",
          }
          if (contractAddress) params.contractaddress = contractAddress
          const txs = await provider.request<Array<Record<string, string>>>(params)
          return txs.map((tx: Record<string, string>) => ({
            hash: tx.hash,
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            tokenDecimal: tx.tokenDecimal,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            timeStamp: tx.timeStamp,
            contractAddress: tx.contractAddress,
          }))
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
