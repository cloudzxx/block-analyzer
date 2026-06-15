import type { Tool, ToolResult } from "../types"
import type { EtherscanProvider } from "@ingest/adapters/etherscan"
import type { Cache } from "@storage/cache/lru"
import { decodeInput } from "./decodeInput"

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/

interface EthTxRaw {
  hash?: string
  from?: string
  to?: string
  value?: string
  gas?: string
  gasPrice?: string
  input?: string
  blockNumber?: string
  timeStamp?: string
  nonce?: string
  transactionIndex?: string
}

interface EthReceiptRaw {
  status?: string           // "0x1" = success, "0x0" = revert
  gasUsed?: string
  effectiveGasPrice?: string
  logs?: Array<{
    address?: string
    topics?: string[]
    data?: string
  }>
}

// ERC-20 Transfer 事件 topic（keccak256("Transfer(address,address,uint256)")）
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

export function createEthGetTxDetailTool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getTxDetail",
    description: "Query detailed information about a specific Ethereum transaction. Returns: decoded input data (function name + arguments for ERC-20/Uniswap/DeFi calls), ETH value transferred, gas cost, tx status (success/revert), and ERC-20 Transfer events emitted. Use this to understand what a transaction actually did.",
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
        const data = await cache.getOrSet(cacheKey, async () => {
          // 并发拉 tx 本体 + receipt（receipt 含 status、gasUsed、logs）
          const [txRaw, receiptRaw] = await Promise.allSettled([
            provider.request<EthTxRaw>({
              module: "proxy", action: "eth_getTransactionByHash", txhash: txHash,
            }),
            provider.request<EthReceiptRaw>({
              module: "proxy", action: "eth_getTransactionReceipt", txhash: txHash,
            }),
          ])

          const tx = txRaw.status === "fulfilled" ? txRaw.value : null
          const receipt = receiptRaw.status === "fulfilled" ? receiptRaw.value : null

          if (!tx) throw new Error("Transaction not found")

          // ETH 转账金额：Wei → Ether，精确到 6 位
          const weiVal = BigInt(tx.value || "0")
          const etherWhole = weiVal / 1_000_000_000_000_000_000n
          const etherFrac = weiVal % 1_000_000_000_000_000_000n
          const valueEther = `${etherWhole}.${etherFrac.toString().padStart(18, "0").slice(0, 6)}`

          // Gas 费用计算：gasUsed * effectiveGasPrice（EIP-1559 后 gasPrice = baseFee + tip）
          const gasUsed = receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : null
          const effectiveGasPrice = receipt?.effectiveGasPrice
            ? BigInt(receipt.effectiveGasPrice)
            : tx.gasPrice ? BigInt(tx.gasPrice) : null
          const gasCostWei = gasUsed !== null && effectiveGasPrice !== null
            ? BigInt(gasUsed) * effectiveGasPrice
            : null
          const gasCostEther = gasCostWei !== null
            ? (Number(gasCostWei) / 1e18).toFixed(8)
            : null

          // 交易状态：receipt.status "0x1" = success，"0x0" = revert
          const status = receipt?.status === "0x1" ? "success"
            : receipt?.status === "0x0" ? "reverted"
            : "pending"

          // 解码 input data：识别函数调用
          const inputHex = tx.input || "0x"
          const decoded = decodeInput(inputHex)
          const inputDecoded = decoded
            ? {
                functionSignature: decoded.signature,
                selector: `0x${decoded.selector}`,
                args: decoded.args,
                ...(decoded.rawInput ? { rawInput: decoded.rawInput } : {}),
              }
            : null

          // 解析 ERC-20 Transfer 事件日志
          // topic[0] = event selector，topic[1] = from（padded），topic[2] = to（padded）
          // data = amount（uint256，padded 32 bytes）
          const tokenTransfers = (receipt?.logs || [])
            .filter((log) => log.topics?.[0] === ERC20_TRANSFER_TOPIC && log.topics.length >= 3)
            .map((log) => {
              const from = "0x" + (log.topics![1] || "").slice(26)
              const to = "0x" + (log.topics![2] || "").slice(26)
              const rawAmount = log.data && log.data !== "0x"
                ? BigInt(log.data).toString()
                : "0"
              return {
                tokenContract: log.address || "",
                from,
                to,
                rawAmount,
              }
            })

          return {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            // ETH 转账
            valueWei: tx.value,
            valueEther,
            // 交易状态
            status,
            // Gas
            gasLimit: tx.gas ? parseInt(tx.gas, 16).toString() : null,
            gasUsed: gasUsed?.toString() ?? null,
            gasCostEther,
            // block
            blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16).toString() : null,
            // 解码后的函数调用（核心新增）
            inputDecoded,
            // ERC-20 Transfer 事件（核心新增）
            tokenTransfers,
          }
        }, Infinity)

        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
