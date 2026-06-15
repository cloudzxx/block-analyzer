import type { Config } from "@shared/config"
import type { Cache } from "@storage/cache/lru"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { SolscanProvider } from "@ingest/adapters/solscan"
import { CoinGeckoProvider } from "@ingest/adapters/coingecko"
import type { AnalysisReport, AnalysisStep } from "./types"

// Solana 知名 program 地址 → 可读标签
// 这些是主网固定地址，不会变化
const SOL_PROGRAM_LABELS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program (SPL)",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8nCh": "Associated Token Account",
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter Aggregator v6",
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB": "Jupiter Aggregator v4",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca Whirlpool",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM v4",
  "5quBtoiQqxF9Jv6KYKctB59NT3gtFD2SqYcR6xYgMHCG": "Raydium AMM v3",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
  "Stake11111111111111111111111111111111111111": "Stake Program",
  "Vote111111111111111111111111111111111111111p": "Vote Program",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr": "Memo Program",
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s": "Metaplex Token Metadata",
  "cndy3Z4yapfJBmL3ShUp5exZkqLc1VPjwMTTlVs3Un": "Candy Machine v2",
  "ComputeBudget111111111111111111111111111111": "Compute Budget",
  "SysvarRent111111111111111111111111111111111": "Sysvar: Rent",
  "SysvarC1ock11111111111111111111111111111111": "Sysvar: Clock",
}

// Solana ownerProgram → 账户类型语义
const SOL_ACCOUNT_TYPE_BY_OWNER: Record<string, { type: string; label: string }> = {
  "11111111111111111111111111111111": { type: "wallet", label: "SOL Wallet (EOA)" },
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": { type: "token_account", label: "SPL Token Account" },
  "Stake11111111111111111111111111111111111111": { type: "stake_account", label: "Stake Account" },
  "Vote111111111111111111111111111111111111111p": { type: "vote_account", label: "Validator Vote Account" },
  "BPFLoaderUpgradeab1e11111111111111111111111": { type: "program", label: "Upgradeable Program" },
  "BPFLoader2111111111111111111111111111111111": { type: "program", label: "BPF Program" },
}

export interface AnalysisStepData {
  step: AnalysisStep
  label: string
  data: Record<string, unknown>
}

export class AnalysisExecutor {
  private ethProvider: EtherscanProvider
  private solProvider: SolscanProvider
  private priceProvider: CoinGeckoProvider

  constructor(
    private config: Config,
    private cache: Cache,
  ) {
    this.ethProvider = new EtherscanProvider(config.ETHERSCAN_API_KEY)
    this.solProvider = new SolscanProvider(config.SOLSCAN_API_KEY)
    this.priceProvider = new CoinGeckoProvider()
  }

  // 分析主流程：resolve → balance → transactions → insights（SSE 流式输出）
  async *analyze(address: string, chain: string): AsyncGenerator<AnalysisStepData | { type: "report"; report: AnalysisReport }> {
    let resolvedAddress = address
    let label = ""

    // === 第一步：解析地址 ===
    yield { step: "resolve" as AnalysisStep, label: "Resolving address", data: {} }
    if (chain === "ethereum" && address.endsWith(".eth")) {
      try {
        const res = await fetch(
          `https://api.ensideas.com/ens/resolve/${encodeURIComponent(address)}`
        )
        if (res.ok) {
          const data = await res.json() as { address?: string; displayName?: string }
          resolvedAddress = data.address || address
          label = data.displayName || ""
        }
      } catch {}
    }
    if (chain === "ethereum" && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      resolvedAddress = address
    }
    if (chain === "solana" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      resolvedAddress = address
    }

    // === 第二步：获取余额 + 账户类型 ===
    yield { step: "balance" as AnalysisStep, label: `Fetching ${chain} balance & account info`, data: {} }
    let balanceValue = "0"
    const unit = chain === "ethereum" ? "ETH" : "SOL"
    let usdValue: string | null = null
    let accountType: AnalysisReport["accountType"]

    try {
      if (chain === "ethereum") {
        // 并发查余额 + 合约 ABI（用于判断 EOA vs Contract）
        const [wei, abiResult] = await Promise.allSettled([
          this.ethProvider.request<string>({
            module: "account", action: "balance", address: resolvedAddress, tag: "latest",
          }),
          this.ethProvider.request<string>({
            module: "contract", action: "getabi", address: resolvedAddress,
          }),
        ])

        if (wei.status === "fulfilled") {
          // Wei → Ether 精确转换，保留 6 位小数
          const weiVal = BigInt(wei.value)
          const etherWhole = weiVal / 1_000_000_000_000_000_000n
          const etherFrac = weiVal % 1_000_000_000_000_000_000n
          balanceValue = `${etherWhole}.${etherFrac.toString().padStart(18, "0").slice(0, 6)}`
          const prices = await this.priceProvider.getPrices()
          usdValue = (parseFloat(balanceValue) * prices.ethereum).toFixed(2)
        }

        // 根据 ABI 查询结果判断账户类型
        // Etherscan 对 EOA 返回 status="0" (ProviderError)，对未验证合约返回特定消息
        if (abiResult.status === "fulfilled") {
          // 能拿到 ABI = verified contract
          let contractName: string | undefined
          try {
            const sourceResult = await this.ethProvider.request<Array<{ ContractName: string }>>({
              module: "contract", action: "getsourcecode", address: resolvedAddress,
            })
            contractName = sourceResult?.[0]?.ContractName || undefined
          } catch {}
          accountType = { type: "contract", contractName, isVerified: true }
        } else {
          const errMsg = (abiResult.reason as Error)?.message || ""
          if (errMsg.includes("Contract source code not verified")) {
            accountType = { type: "contract", isVerified: false }
          } else {
            // ABI 查询失败且不是"未验证"错误 → EOA（外部账户）
            accountType = { type: "eoa" }
          }
        }
      } else {
        // Solana：getAccountInfo 返回 ownerProgram，据此判断账户类型
        const info = await this.solProvider.request<{
          lamports?: number
          ownerProgram?: string
          executable?: boolean
          type?: string
        }>({ module: "account", action: "info", address: resolvedAddress })

        const lamports = info.lamports || 0
        balanceValue = (lamports / 1e9).toFixed(6)
        const prices = await this.priceProvider.getPrices()
        usdValue = (parseFloat(balanceValue) * prices.solana).toFixed(2)

        // 根据 ownerProgram 确定账户类型语义
        const ownerProgram = info.ownerProgram || ""
        const knownType = SOL_ACCOUNT_TYPE_BY_OWNER[ownerProgram]
        const ownerLabel = SOL_PROGRAM_LABELS[ownerProgram] || ownerProgram.slice(0, 12) + "..."

        if (info.executable) {
          accountType = { type: "program", ownerProgram, ownerLabel: "On-chain Program (executable)" }
        } else if (knownType) {
          accountType = { type: knownType.type, ownerProgram, ownerLabel: knownType.label }
        } else {
          accountType = { type: "unknown", ownerProgram, ownerLabel }
        }
      }
    } catch {}

    // === 第三步：获取交易记录（含 Solana token transfer 真实金额）===
    yield { step: "transactions" as AnalysisStep, label: "Fetching recent transactions", data: {} }
    let txCount = 0
    const counterpartyMap = new Map<string, { txCount: number; totalValue: number }>()
    let firstTxTime = ""
    let lastTxTime = ""
    let totalValue = 0

    // Solana 专用：program 调用计数
    const programCountMap = new Map<string, number>()
    let tokenTransferVolumeSol = 0

    // ETH 专用：ERC-20 token 转账统计
    const tokenCountMap = new Map<string, { symbol: string; count: number }>()
    let ethTransferVolume = 0

    try {
      if (chain === "ethereum") {
        // 并发拉 ETH 转账列表 + ERC-20 token 转账列表
        // txlist 仅含原生 ETH 转账及合约调用，tokentx 才包含 ERC-20 Transfer 事件
        const [txsResult, tokenTxsResult] = await Promise.allSettled([
          this.ethProvider.request<Array<{
            hash: string; from: string; to: string; value: string; timeStamp: string
          }>>({
            module: "account", action: "txlist", address: resolvedAddress,
            startblock: "0", endblock: "99999999", page: "1", offset: "50", sort: "desc",
          }),
          this.ethProvider.request<Array<{
            hash: string; from: string; to: string
            value: string; tokenName: string; tokenSymbol: string
            tokenDecimal: string; contractAddress: string; timeStamp: string
          }>>({
            module: "account", action: "tokentx", address: resolvedAddress,
            startblock: "0", endblock: "99999999", page: "1", offset: "50", sort: "desc",
          }),
        ])

        // 处理原生 ETH 转账
        if (txsResult.status === "fulfilled") {
          const rawTxs = txsResult.value
          txCount = rawTxs.length
          for (const tx of rawTxs) {
            // value 是 Wei 字符串，转为 ETH（除以 10^18）
            const val = Number(BigInt(tx.value || "0")) / 1e18
            ethTransferVolume += val
            totalValue += val

            const counterparty = tx.from.toLowerCase() === resolvedAddress.toLowerCase() ? tx.to : tx.from
            if (counterparty && counterparty.toLowerCase() !== resolvedAddress.toLowerCase()) {
              const existing = counterpartyMap.get(counterparty.toLowerCase()) || { txCount: 0, totalValue: 0 }
              existing.txCount++
              existing.totalValue += val
              counterpartyMap.set(counterparty.toLowerCase(), existing)
            }
            if (tx.timeStamp) {
              if (!firstTxTime || tx.timeStamp < firstTxTime) firstTxTime = tx.timeStamp
              if (!lastTxTime || tx.timeStamp > lastTxTime) lastTxTime = tx.timeStamp
            }
          }
        }

        // 处理 ERC-20 token 转账
        // 注意：token 金额单位各不相同（USDC=6位，DAI=18位等），不与 ETH 合并累加
        // 但对手方交互次数需要合并计入，并统计 token 种类
        if (tokenTxsResult.status === "fulfilled") {
          const tokenTxs = tokenTxsResult.value
          // 叠加到 txCount（token 转账也是链上交互）
          txCount += tokenTxs.length

          for (const tx of tokenTxs) {
            // 统计 token 种类：按合约地址去重，记录 symbol
            const contractAddr = tx.contractAddress.toLowerCase()
            if (!tokenCountMap.has(contractAddr)) {
              tokenCountMap.set(contractAddr, { symbol: tx.tokenSymbol || tx.tokenName, count: 0 })
            }
            tokenCountMap.get(contractAddr)!.count++

            // 对手方合并：token 转账的 from/to 也算交互
            const counterparty = tx.from.toLowerCase() === resolvedAddress.toLowerCase() ? tx.to : tx.from
            if (counterparty && counterparty.toLowerCase() !== resolvedAddress.toLowerCase()) {
              const existing = counterpartyMap.get(counterparty.toLowerCase()) || { txCount: 0, totalValue: 0 }
              existing.txCount++
              counterpartyMap.set(counterparty.toLowerCase(), existing)
            }

            // 更新时间范围（token 转账也有时间戳）
            if (tx.timeStamp) {
              if (!firstTxTime || tx.timeStamp < firstTxTime) firstTxTime = tx.timeStamp
              if (!lastTxTime || tx.timeStamp > lastTxTime) lastTxTime = tx.timeStamp
            }
          }
        }
      } else {
        // Solana 分两路并发：
        //   1. /account/transactions — 拿 tx 列表、时间、signer（用于对手方 + 时间范围）
        //   2. /account/transfer     — 拿真实 token 转账金额（SOL + SPL token）
        const [txsResult, transfersResult] = await Promise.allSettled([
          this.solProvider.request<Array<{
            txHash?: string
            fee?: number
            blockTime?: number
            signer?: string
            parsedInstruction?: Array<{ programId?: string; type?: string }>
          }>>({ module: "account", action: "transactions", address: resolvedAddress, limit: "40" }),

          this.solProvider.request<Array<{
            transId?: string
            blockTime?: number
            fromAddress?: string
            toAddress?: string
            tokenAddress?: string
            amount?: number
            tokenDecimals?: number
            flow?: string
            activityType?: string
          }>>({ module: "account", action: "transfer", address: resolvedAddress, limit: "40" }),
        ])

        // 处理交易列表（signer 作为对手方，提取 program 调用统计）
        if (txsResult.status === "fulfilled") {
          const rawTxs = txsResult.value
          txCount = rawTxs.length

          for (const tx of rawTxs) {
            // 从 parsedInstruction 数组统计各 program 调用次数
            if (Array.isArray(tx.parsedInstruction)) {
              for (const ix of tx.parsedInstruction) {
                const pid = ix.programId || ""
                if (pid) programCountMap.set(pid, (programCountMap.get(pid) || 0) + 1)
              }
            }

            // signer 是发起这笔 tx 的账户，如果不是自己则算对手方
            const signer = tx.signer || ""
            if (signer && signer !== resolvedAddress) {
              const existing = counterpartyMap.get(signer) || { txCount: 0, totalValue: 0 }
              existing.txCount++
              counterpartyMap.set(signer, existing)
            }

            if (tx.blockTime) {
              const ts = new Date(tx.blockTime * 1000).toISOString()
              if (!firstTxTime || ts < firstTxTime) firstTxTime = ts
              if (!lastTxTime || ts > lastTxTime) lastTxTime = ts
            }
          }
        }

        // 处理 token transfer（这里才有真实的转账金额）
        if (transfersResult.status === "fulfilled") {
          const transfers = transfersResult.value
          for (const t of transfers) {
            const raw = t.amount ?? 0
            const decimals = t.tokenDecimals ?? 9
            // 归一化到 token 实际数量
            const normalizedAmount = raw / Math.pow(10, decimals)

            if (!t.tokenAddress || t.activityType === "ACTIVITY_SOL_TRANSFER") {
              // 原生 SOL 转账：直接累加
              tokenTransferVolumeSol += normalizedAmount
              totalValue += normalizedAmount

              // 对手方：from/to 中不是自己的那个
              const cp = t.fromAddress === resolvedAddress ? t.toAddress : t.fromAddress
              if (cp && cp !== resolvedAddress) {
                const existing = counterpartyMap.get(cp) || { txCount: 0, totalValue: 0 }
                existing.txCount++
                existing.totalValue += normalizedAmount
                counterpartyMap.set(cp, existing)
              }
            } else {
              // SPL token 转账：金额单位不同，不直接累加到 SOL totalValue
              // 但统计对手方交互次数
              const cp = t.fromAddress === resolvedAddress ? t.toAddress : t.fromAddress
              if (cp && cp !== resolvedAddress) {
                const existing = counterpartyMap.get(cp) || { txCount: 0, totalValue: 0 }
                existing.txCount++
                counterpartyMap.set(cp, existing)
              }
            }
          }
        }
      }
    } catch {}

    // 按交互次数排序，取 Top 10
    const topCounterparties = [...counterpartyMap.entries()]
      .sort((a, b) => b[1].txCount - a[1].txCount)
      .slice(0, 10)
      .map(([addr, data]) => ({
        address: addr,
        txCount: data.txCount,
        totalValue: data.totalValue.toFixed(4),
      }))

    // ETH: 按转账次数排序的 top token 列表
    const topTokens = [...tokenCountMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([contractAddress, info]) => ({
        symbol: info.symbol,
        contractAddress,
        transferCount: info.count,
      }))

    // Solana program 调用统计，按频次排序，附上可读标签
    const programActivity = [...programCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([programId, count]) => ({
        programId,
        label: SOL_PROGRAM_LABELS[programId] || programId.slice(0, 8) + "...",
        count,
      }))

    // === 第四步：LLM 生成洞察 ===
    yield { step: "insights" as AnalysisStep, label: "AI generating insights", data: {} }
    let insights = ""
    let riskScore: "low" | "medium" | "high" = "low"
    let riskFlags: Array<{ label: string; severity: "info" | "warning" | "critical" }> = []

    try {
      const accountTypeLine = accountType
        ? chain === "ethereum"
          ? `Account Type: ${accountType.type === "eoa" ? "EOA (Externally Owned Account)" : `Smart Contract${accountType.contractName ? ` — ${accountType.contractName}` : ""}${accountType.isVerified ? " (verified)" : " (unverified)"}`}`
          : `Account Type: ${accountType.ownerLabel || accountType.type}`
        : ""

      // ETH: token 活动摘要行（展示哪些 token 被频繁使用）
      const tokenActivityLine = chain === "ethereum" && topTokens.length > 0
        ? `ERC-20 Token Activity (top ${topTokens.length}): ${topTokens.map(t => `${t.symbol}(${t.transferCount} transfers)`).join(", ")}`
        : ""

      const ethVolumeLine = chain === "ethereum" && ethTransferVolume > 0
        ? `Native ETH Transfer Volume: ${ethTransferVolume.toFixed(6)} ETH`
        : ""

      const programLine = programActivity.length > 0
        ? `Program Activity (Solana instructions):\n${programActivity.map(p => `  - ${p.label}: ${p.count} calls`).join("\n")}`
        : ""

      const tokenVolumeLine = chain === "solana" && tokenTransferVolumeSol > 0
        ? `Native SOL Transfer Volume: ${tokenTransferVolumeSol.toFixed(4)} SOL`
        : ""

      const insightPrompt = `You are a blockchain analysis AI. Analyze this wallet data and produce a concise report.

Address: ${resolvedAddress}${label ? ` (${label})` : ""}
Chain: ${chain}
${accountTypeLine}
Balance: ${balanceValue} ${unit}${usdValue ? ` (~$${usdValue} USD)` : ""}
Recent Transaction Count (ETH + token transfers): ${txCount}
${firstTxTime ? `Activity Period: ${new Date(isNaN(Number(firstTxTime)) ? firstTxTime : Number(firstTxTime) * 1000).toISOString().slice(0, 10)} to ${new Date(isNaN(Number(lastTxTime)) ? lastTxTime : Number(lastTxTime) * 1000).toISOString().slice(0, 10)}` : ""}
${ethVolumeLine}
${tokenActivityLine}
${tokenVolumeLine}
${programLine}
Top Counterparties: ${topCounterparties.slice(0, 3).map(c => `${c.address.slice(0, 10)}... (${c.txCount} interactions)`).join(", ")}

Respond in this exact JSON format:
{
  "riskScore": "low" | "medium" | "high",
  "riskFlags": [{ "label": "flag description", "severity": "info" | "warning" | "critical" }],
  "insights": "2-4 sentence analysis of this wallet's activity, what kind of user it is, notable patterns or concerns"
}`

      const res = await fetch(`${this.config.LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.config.LLM_MODEL,
          messages: [{ role: "user", content: insightPrompt }],
          temperature: 0.3,
          stream: false,
        }),
      })

      if (res.ok) {
        const json = await res.json() as {
          choices: Array<{ message: { content: string } }>
        }
        const content = json.choices?.[0]?.message?.content || ""
        const parsed = tryExtractJSON(content)
        if (parsed) {
          riskScore = (parsed.riskScore as typeof riskScore) || "low"
          riskFlags = (parsed.riskFlags as typeof riskFlags) || []
          insights = (parsed.insights as string) || ""
        } else {
          insights = content || "AI analysis unavailable."
        }
      }
    } catch (err) {
      console.error("AI insights error:", err)
      insights = "AI analysis unavailable. Showing raw data."
    }

    const report: AnalysisReport = {
      address,
      resolvedAddress,
      label: label || undefined,
      chain,
      analysisType: accountType?.type === "contract" ? "contract" : "wallet",
      timestamp: Date.now(),
      accountType,
      balance: { value: balanceValue, unit, usdValue },
      transactions: {
        count: txCount,
        timeRange: firstTxTime ? { start: firstTxTime, end: lastTxTime || firstTxTime } : null,
        topCounterparties,
        // ETH 专属：原生 ETH 转账量 + ERC-20 token 统计
        ...(chain === "ethereum" && ethTransferVolume > 0
          ? { ethTransferVolume: ethTransferVolume.toFixed(6) }
          : {}),
        ...(chain === "ethereum" && topTokens.length > 0 ? { topTokens } : {}),
        // Solana 专属
        ...(chain === "solana" && programActivity.length > 0 ? { programActivity } : {}),
        ...(chain === "solana" && tokenTransferVolumeSol > 0
          ? { tokenTransferVolume: tokenTransferVolumeSol.toFixed(4) }
          : {}),
      },
      risk: { score: riskScore, flags: riskFlags },
      insights,
    }

    yield { type: "report", report }
  }
}

// 从 LLM 回复中提取 JSON：优先直接解析，其次从 ```json 代码块中提取
function tryExtractJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text) } catch {}
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (blockMatch) {
    try { return JSON.parse(blockMatch[1]) } catch {}
  }
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]) } catch {}
  }
  return null
}
