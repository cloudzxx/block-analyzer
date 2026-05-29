import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "../../../ingest/adapters/etherscan"
import type { Cache } from "../../../storage/cache/lru"

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/

export function createEthGetTxDetailTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getTxDetail",
    description: "Query detailed information about a specific Ethereum transaction by its hash.",
    parameters: {
      type: "object",
      properties: { txHash: { type: "string", description: "Transaction hash (0x + 64 hex chars)" } },
      required: ["txHash"],
    },
    cacheTTL: Infinity,

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const txHash = args.txHash as string
      if (!txHash || !TX_HASH_REGEX.test(txHash)) {
        return { success: false, error: "Invalid transaction hash format" }
      }
      try {
        const cacheKey = `eth:tx:${txHash.toLowerCase()}`
        const raw = await cache.getOrSet(cacheKey, () =>
          provider.request<any>({
            module: "proxy", action: "eth_getTransactionByHash", txhash: txHash,
          }),
          Infinity,
        )
        const tx = raw as any
        return {
          success: true,
          data: {
            hash: tx.hash, from: tx.from, to: tx.to,
            valueWei: tx.value,
            valueEther: (BigInt(tx.value || "0") / BigInt(1e18)).toString(),
            gas: tx.gas, gasPrice: tx.gasPrice, input: tx.input,
            blockNumber: tx.blockNumber, timeStamp: tx.timeStamp,
          },
        }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
