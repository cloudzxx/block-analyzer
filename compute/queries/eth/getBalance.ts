import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "@ingest/adapters/etherscan"
import type { Cache } from "@storage/cache/lru"
import { isEthereumAddress } from "@shared/chain"

// ETH 余额查询工具：调用 Etherscan API，15s 缓存
export function createEthGetBalanceTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getBalance",
    description: "Query the ETH balance of an Ethereum address. Returns balance in Wei and Ether.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (0x...)" },
      },
      required: ["address"],
    },
    cacheTTL: 15_000, // 余额缓存 15 秒

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const address = args.address as string
      if (!address || !isEthereumAddress(address)) {
        return { success: false, error: "Invalid Ethereum address format" }
      }
      try {
        // 优先走缓存（getOrSet），避免高频请求
        const cacheKey = `eth:balance:${address.toLowerCase()}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const wei = await provider.request<string>({
            module: "account", action: "balance", address, tag: "latest",
          })
          // Wei → Ether 转换（10^18）
          const ether = (BigInt(wei) / BigInt(1_000_000_000_000_000_000n)).toString()
          return { balanceWei: wei, balanceEther: ether }
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
