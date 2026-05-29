import type { Config } from "../shared/config"
import type { Cache } from "../cache/lru"
import { EtherscanProvider } from "../providers/etherscan"
import { SolscanProvider } from "../providers/solscan"
import { CoinGeckoProvider } from "../providers/coingecko"
import type { AnalysisReport, AnalysisStep } from "./types"

export interface AnalysisStepData {
  step: AnalysisStep
  label: string
  data: Record<string, unknown>
}

// 分析执行器：固定 4 步流程，分别调用区块链 API 获取数据，最后由 LLM 生成洞察
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
      // ENS 名称解析（通过 ensideas 公共 API）
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
    // 如果是标准十六进制地址或 Solana Base58 地址，直接使用
    if (chain === "ethereum" && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      resolvedAddress = address
    }
    if (chain === "solana" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      resolvedAddress = address
    }

    // === 第二步：获取余额 ===
    yield { step: "balance" as AnalysisStep, label: `Fetching ${chain} balance`, data: {} }
    let balanceValue = "0"
    let unit = chain === "ethereum" ? "ETH" : "SOL"
    let usdValue: string | null = null

    try {
      if (chain === "ethereum") {
        // 调用 Etherscan API 获取 ETH 余额（返回 Wei）
        const wei = await this.ethProvider.request<string>({
          module: "account", action: "balance", address: resolvedAddress, tag: "latest",
        })
        // Wei 转换为 Ether（1 ETH = 10^18 Wei）
        const ether = (BigInt(wei) / BigInt(1_000_000_000_000_000_000n)).toString()
        balanceValue = ether
        // 获取实时价格并计算 USD 估值
        const prices = await this.priceProvider.getPrices()
        const usd = parseFloat(ether) * prices.ethereum
        usdValue = usd.toFixed(2)
      } else {
        // Solana 余额查询（返回 lamports，1 SOL = 10^9 lamports）
        const info = await this.solProvider.request<{ lamports: number }>({
          module: "account", action: "info", address: resolvedAddress,
        })
        const lamports = info.lamports || 0
        balanceValue = (lamports / 1e9).toString()
        const prices = await this.priceProvider.getPrices()
        const usd = parseFloat(balanceValue) * prices.solana
        usdValue = usd.toFixed(2)
      }
    } catch {}

    // === 第三步：获取交易记录 ===
    yield { step: "transactions" as AnalysisStep, label: "Fetching recent transactions", data: {} }
    let txCount = 0
    // 交易对手聚合映射
    const counterpartyMap = new Map<string, { txCount: number; totalValue: number }>()
    let firstTxTime = ""
    let lastTxTime = ""
    let totalValue = 0

    try {
      if (chain === "ethereum") {
        // 调取 Etherscan 交易列表
        const rawTxs = await this.ethProvider.request<Array<{
          hash: string; from: string; to: string; value: string; timeStamp: string
        }>>({
          module: "account", action: "txlist", address: resolvedAddress,
          startblock: "0", endblock: "99999999", page: "1", offset: "50", sort: "desc",
        })

        txCount = rawTxs.length
        for (const tx of rawTxs) {
          const val = parseFloat(tx.value) || 0
          totalValue += val
          // 找到交易对手方（与当前地址不同的那一方）
          const counterparty = tx.from.toLowerCase() === resolvedAddress.toLowerCase() ? tx.to : tx.from
          if (counterparty && counterparty.toLowerCase() !== resolvedAddress.toLowerCase()) {
            const existing = counterpartyMap.get(counterparty) || { txCount: 0, totalValue: 0 }
            existing.txCount++
            existing.totalValue += val
            counterpartyMap.set(counterparty, existing)
          }

          if (tx.timeStamp) {
            if (!firstTxTime || tx.timeStamp < firstTxTime) firstTxTime = tx.timeStamp
            if (!lastTxTime || tx.timeStamp > lastTxTime) lastTxTime = tx.timeStamp
          }
        }
      } else {
        // Solana 交易列表（/account/transactions 不返回 transfer amount，只有 fee）
        const rawTxs = await this.solProvider.request<Array<{
          txHash?: string; fee?: number; blockTime?: number; signer?: string; blockId?: number
        }>>({
          module: "account", action: "transactions", address: resolvedAddress, limit: "40",
        })

        txCount = rawTxs.length
        for (const tx of rawTxs) {
          // Solana 交易不含 value 字段，仅记录 fee 作为 activity 参考
          totalValue += (tx.fee || 0) / 1e9

          const counterparty = tx.signer || ""
          if (counterparty && counterparty.toLowerCase() !== resolvedAddress.toLowerCase()) {
            const existing = counterpartyMap.get(counterparty) || { txCount: 0, totalValue: 0 }
            existing.txCount++
            existing.totalValue += (tx.fee || 0) / 1e9
            counterpartyMap.set(counterparty, existing)
          }

          if (tx.blockTime) {
            const ts = new Date(tx.blockTime * 1000).toISOString()
            if (!firstTxTime || ts < firstTxTime) firstTxTime = ts
            if (!lastTxTime || ts > lastTxTime) lastTxTime = ts
          }
        }
      }
    } catch {}

    // 按交互次数排序，取 Top 10 交易对手
    const topCounterparties = [...counterpartyMap.entries()]
      .sort((a, b) => b[1].txCount - a[1].txCount)
      .slice(0, 10)
      .map(([addr, data]) => ({
        address: addr,
        txCount: data.txCount,
        totalValue: data.totalValue.toFixed(4),
      }))

    // === 第四步：LLM 生成洞察 ===
    yield { step: "insights" as AnalysisStep, label: "AI generating insights", data: {} }
    let insights = ""
    let riskScore: "low" | "medium" | "high" = "low"
    let riskFlags: Array<{ label: string; severity: "info" | "warning" | "critical" }> = []

    try {
      // 构造 LLM 分析提示，要求返回结构化 JSON
      const insightPrompt = `You are a blockchain analysis AI. Analyze this wallet data and produce a concise report.

Address: ${resolvedAddress}${label ? ` (${label})` : ""}
Chain: ${chain}
Balance: ${balanceValue} ${unit}${usdValue ? ` (~$${usdValue} USD)` : ""}
Recent Transaction Count: ${txCount}
${firstTxTime ? `Activity Period: ${firstTxTime} to ${lastTxTime || firstTxTime}` : ""}
Total Volume (raw sum): ${totalValue.toFixed(4)} ${unit}
Top Counterparties: ${topCounterparties.slice(0, 3).map(c => `${c.address.slice(0, 10)}... (${c.txCount} txs, ${c.totalValue} ${unit})`).join(", ")}

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
          temperature: 0.3, // 低温度以获得更确定的输出
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
          riskScore = parsed.riskScore || "low"
          riskFlags = parsed.riskFlags || []
          insights = parsed.insights || ""
        } else {
          insights = content || "AI analysis unavailable."
        }
      }
    } catch (err) {
      console.error("AI insights error:", err)
      insights = "AI analysis unavailable. Showing raw data."
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

    // 组装最终分析报告
    const report: AnalysisReport = {
      address,
      resolvedAddress,
      label: label || undefined,
      chain,
      analysisType: "wallet",
      timestamp: Date.now(),
      balance: { value: balanceValue, unit, usdValue },
      transactions: {
        count: txCount,
        timeRange: firstTxTime ? { start: firstTxTime, end: lastTxTime || firstTxTime } : null,
        topCounterparties,
      },
      risk: { score: riskScore, flags: riskFlags },
      insights,
    }

    yield { type: "report", report }
  }
}
