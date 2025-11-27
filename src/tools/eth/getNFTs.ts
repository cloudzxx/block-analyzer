import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "../../providers/etherscan"
import type { Cache } from "../../cache/lru"
import { isEthereumAddress } from "../../shared/chain"

export function createEthGetNFTsTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getNFTs",
    description: "Query ERC-721 / ERC-1155 NFTs held by an Ethereum address. Returns token contract, token ID, and metadata.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (0x...)" },
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
      try {
        const cacheKey = `eth:nfts:${address.toLowerCase()}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const nfts = await provider.request<Array<{
            contractAddress: string
            tokenID: string
            tokenName: string
            tokenSymbol: string
            tokenURI?: string
          }>>({
            module: "account", action: "tokennfttx",
            address, page: String(args.page || 1),
            offset: String(Math.min(args.offset as number || 50, 100)),
            sort: "desc",
          })
          return nfts.map((nft) => ({
            contractAddress: nft.contractAddress,
            tokenId: nft.tokenID,
            name: nft.tokenName,
            symbol: nft.tokenSymbol,
            uri: nft.tokenURI || "",
          }))
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
