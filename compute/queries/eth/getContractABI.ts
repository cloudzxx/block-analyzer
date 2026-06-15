import type { Tool, ToolContext, ToolResult } from "../types"
import type { EtherscanProvider } from "@ingest/adapters/etherscan"
import type { Cache } from "@storage/cache/lru"
import { isEthereumAddress } from "@shared/chain"

export function createEthGetContractABITool(provider: EtherscanProvider, cache: Cache): Tool {
  return {
    name: "eth_getContractABI",
    description: "Get the ABI and type of an Ethereum address. For verified contracts: returns full ABI and contract name. For unverified contracts: flags as contract but no ABI. For EOAs (wallets): returns accountType=eoa. Use this to determine if an address is a wallet or smart contract before further analysis.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (0x...)" },
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
          // 并发查 ABI 和源码（源码包含合约名称）
          const [abiResult, sourceResult] = await Promise.allSettled([
            provider.request<string>({ module: "contract", action: "getabi", address }),
            provider.request<Array<{ ContractName: string; CompilerVersion: string }>>({
              module: "contract", action: "getsourcecode", address,
            }),
          ])

          if (abiResult.status === "fulfilled") {
            // 能拿到 ABI → verified contract
            const contractName = sourceResult.status === "fulfilled"
              ? sourceResult.value?.[0]?.ContractName || undefined
              : undefined
            const compilerVersion = sourceResult.status === "fulfilled"
              ? sourceResult.value?.[0]?.CompilerVersion || undefined
              : undefined
            return {
              accountType: "contract",
              isVerified: true,
              contractName,
              compilerVersion,
              address,
              abi: JSON.parse(abiResult.value),
            }
          }

          // ABI 查询失败 — 区分"未验证合约"和"EOA"
          const errMsg = (abiResult.reason as Error)?.message || ""
          if (errMsg.includes("Contract source code not verified")) {
            return { accountType: "contract", isVerified: false, address, abi: null }
          }

          // Etherscan 对 EOA 返回 "Contract source code not verified" 或空结果
          // 其他错误（如地址不存在）也归为 EOA 以避免误判
          return { accountType: "eoa", address, abi: null }
        }, this.cacheTTL!)
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  }
}
