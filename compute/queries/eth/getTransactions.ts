import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "@ingest/adapters/etherscan"
import type { Cache } from "@storage/cache/lru"
import { isEthereumAddress } from "@shared/chain"

export function createEthGetTransactionsTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getTransactions",
    description: "Query recent transactions for an Ethereum address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (0x...)" },
        limit: { type: "number", description: "Max number of transactions (default 10, max 50)" },
      },
      required: ["address"],
    },
    cacheTTL: 60_000,

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const address = args.address as string
      const limit = Math.min(Number(args.limit) || 10, 50)
      if (!address || !isEthereumAddress(address)) {
        return { success: false, error: "Invalid Ethereum address format" }
      }
      try {
        const cacheKey = `eth:txs:${address.toLowerCase()}:${limit}`
        const raw = await cache.getOrSet(cacheKey, () =>
          provider.request<unknown[]>({
            module: "account", action: "txlist", address,
            startblock: "0", endblock: "99999999", page: "1", offset: String(limit), sort: "desc",
          }),
          (this as Tool).cacheTTL!,
        )
        const transactions = (raw as any[]).map((tx: any) => ({
          hash: tx.hash, from: tx.from, to: tx.to,
          valueWei: tx.value,
          valueEther: (BigInt(tx.value || "0") / BigInt(1e18)).toString(),
          blockNumber: tx.blockNumber, timeStamp: tx.timeStamp,
          gas: tx.gas, gasPrice: tx.gasPrice,
        }))
        return { success: true, data: transactions }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
