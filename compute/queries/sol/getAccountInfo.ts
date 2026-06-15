import type { Tool, ToolContext, ToolResult } from "../types"
import type { SolscanProvider } from "@ingest/adapters/solscan"
import type { Cache } from "@storage/cache/lru"
import { isSolanaAddress } from "@shared/chain"

// ownerProgram → 人类可读账户类型
// Solana 每个账户都被一个 program "拥有"，这个 program 决定了账户的用途
const OWNER_LABELS: Record<string, { accountType: string; description: string }> = {
  "11111111111111111111111111111111": {
    accountType: "SOL Wallet",
    description: "Externally owned account controlled by a private key",
  },
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": {
    accountType: "SPL Token Account",
    description: "Holds a specific SPL token — not the wallet itself, but a token-holding sub-account",
  },
  "Stake11111111111111111111111111111111111111": {
    accountType: "Stake Account",
    description: "SOL staked to a validator; may have lockup and cooldown periods",
  },
  "Vote111111111111111111111111111111111111111p": {
    accountType: "Validator Vote Account",
    description: "Used by validators to record votes; not a user wallet",
  },
  "BPFLoaderUpgradeab1e11111111111111111111111": {
    accountType: "Upgradeable Program",
    description: "An on-chain program (smart contract) that can be upgraded by its authority",
  },
  "BPFLoader2111111111111111111111111111111111": {
    accountType: "BPF Program",
    description: "An immutable on-chain program (smart contract)",
  },
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX": {
    accountType: "SNS Name Account",
    description: "Solana Name Service domain (e.g., .sol domain)",
  },
}

export function createSolGetAccountInfoTool(provider: SolscanProvider, cache: Cache): Tool {
  return {
    name: "sol_getAccountInfo",
    description: "Get detailed account information for a Solana address. Returns balance, account type (wallet / SPL token account / stake account / program), and the ownerProgram with a human-readable label explaining what kind of account this is.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Solana address" },
      },
      required: ["address"],
    },
    cacheTTL: 60_000,

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const address = args.address as string
      if (!address || !isSolanaAddress(address)) {
        return { success: false, error: "Invalid Solana address format" }
      }
      try {
        const cacheKey = `sol:accountInfo:${address}`
        const data = await cache.getOrSet(cacheKey, async () => {
          const info = await provider.request<{
            account?: string
            lamports?: number
            ownerProgram?: string
            executable?: boolean
            rentEpoch?: number
            type?: string
            isOncurve?: number
          }>({ module: "account", action: "info", address })

          const ownerProgram = info.ownerProgram || ""
          const ownerMeta = OWNER_LABELS[ownerProgram]

          // executable=true 表示这是一个已部署的 on-chain program
          let accountType: string
          let accountDescription: string
          if (info.executable) {
            accountType = "On-chain Program"
            accountDescription = "Executable program deployed on Solana (smart contract)"
          } else if (ownerMeta) {
            accountType = ownerMeta.accountType
            accountDescription = ownerMeta.description
          } else {
            accountType = "Unknown"
            accountDescription = `Owned by program: ${ownerProgram.slice(0, 12)}...`
          }

          return {
            address: info.account || address,
            lamports: info.lamports || 0,
            solBalance: ((info.lamports || 0) / 1e9).toFixed(6),
            // ownerProgram 是理解 Solana 账户的关键字段
            ownerProgram,
            accountType,
            accountDescription,
            executable: info.executable || false,
            rentEpoch: info.rentEpoch || 0,
          }
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
