import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "@ingest/adapters/solscan"
import type { Cache } from "@storage/cache/lru"

// Solana 知名 program 标签（与 analytics/executor 保持一致）
const PROGRAM_LABELS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program (SPL)",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8nCh": "Associated Token Account",
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter Aggregator v6",
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB": "Jupiter Aggregator v4",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca Whirlpool",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM v4",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
  "Stake11111111111111111111111111111111111111": "Stake Program",
  "ComputeBudget111111111111111111111111111111": "Compute Budget",
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s": "Metaplex Token Metadata",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr": "Memo Program",
}

interface SolTxRaw {
  txHash?: string
  blockTime?: number
  blockId?: number
  slot?: number
  fee?: number
  signer?: string | string[]
  status?: string
  // Solscan v2 返回的 parsedInstruction 数组
  parsedInstruction?: Array<{
    programId?: string
    type?: string
    data?: unknown
  }>
  // token balances delta（交易前后余额变化，反映真实 token 转移）
  tokenBalancesChange?: Array<{
    account?: string
    tokenAddress?: string
    preBalance?: number
    postBalance?: number
    changeAmount?: number
    decimals?: number
  }>
}

export function createSolGetTxDetailTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getTxDetail",
    description: "Query detailed information about a specific Solana transaction by its signature. Returns instructions breakdown (programs called), token balance changes (actual transfer amounts), fee, and signer.",
    parameters: {
      type: "object",
      properties: { signature: { type: "string", description: "Transaction signature (base58)" } },
      required: ["signature"],
    },
    cacheTTL: Infinity,

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const signature = args.signature as string
      if (!signature || signature.length < 32) {
        return { success: false, error: "Invalid transaction signature" }
      }
      try {
        const cacheKey = `sol:tx:${signature}`
        const raw = await cache.getOrSet(cacheKey, () =>
          provider.request<SolTxRaw>({
            module: "transaction", action: "detail", signature,
          }),
          Infinity,
        )
        const tx = raw as SolTxRaw

        // 解析 instructions：每条 instruction 对应一个 program 调用
        const instructions = (tx.parsedInstruction || []).map((ix) => ({
          programId: ix.programId || "",
          programLabel: ix.programId ? (PROGRAM_LABELS[ix.programId] || ix.programId.slice(0, 12) + "...") : "unknown",
          type: ix.type || "unknown",
        }))

        // 解析 token balance 变化：这是 Solana 上"真实转账金额"的来源
        // 每个账户在 tx 前后的 token 余额差值 = 实际收到/发出的 token 数量
        const balanceChanges = (tx.tokenBalancesChange || [])
          .filter((b) => (b.changeAmount ?? 0) !== 0)
          .map((b) => {
            const decimals = b.decimals ?? 9
            const change = (b.changeAmount ?? 0) / Math.pow(10, decimals)
            return {
              account: b.account || "",
              tokenMint: b.tokenAddress || "SOL",
              changeAmount: change.toFixed(decimals > 6 ? 6 : decimals),
              direction: change > 0 ? "in" : "out",
            }
          })

        const signers = Array.isArray(tx.signer) ? tx.signer : tx.signer ? [tx.signer] : []

        return {
          success: true,
          data: {
            txHash: tx.txHash,
            blockTime: tx.blockTime,
            slot: tx.blockId ?? tx.slot,
            fee: tx.fee ? `${(tx.fee / 1e9).toFixed(6)} SOL` : "0 SOL",
            signers,
            status: tx.status,
            // instruction 列表：展示这笔 tx 调用了哪些 program
            instructions,
            // token balance 变化：真实的资金流动
            balanceChanges,
          },
        }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
