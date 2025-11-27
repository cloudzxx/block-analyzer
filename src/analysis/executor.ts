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

  async *analyze(address: string, chain: string): AsyncGenerator<AnalysisStepData | { type: "report"; report: AnalysisReport }> {
    let resolvedAddress = address
    let label = ""

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

    yield { step: "balance" as AnalysisStep, label: `Fetching ${chain} balance`, data: {} }
    let balanceValue = "0"
    let unit = chain === "ethereum" ? "ETH" : "SOL"
    let usdValue: string | null = null

    try {
      if (chain === "ethereum") {
        const wei = await this.ethProvider.request<string>({
          module: "account", action: "balance", address: resolvedAddress, tag: "latest",
        })
        const ether = (BigInt(wei) / BigInt(1_000_000_000_000_000_000n)).toString()
        balanceValue = ether
        const prices = await this.priceProvider.getPrices()
        const usd = parseFloat(ether) * prices.ethereum
        usdValue = usd.toFixed(2)
      } else {
        const info = await this.solProvider.request<{ lamports: number }>({
          module: "account", action: "info", address: resolvedAddress,
        })
        const lamports = info.lamports || 0
        balanceValue = (lamports / 1e9).toString()
      }
    } catch {}

    yield { step: "transactions" as AnalysisStep, label: "Fetching recent transactions", data: {} }
    let txCount = 0
    const counterpartyMap = new Map<string, { txCount: number; totalValue: number }>()
    let firstTxTime = ""
    let lastTxTime = ""
    let totalValue = 0

    try {
      if (chain === "ethereum") {
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
        const rawTxs = await this.solProvider.request<Array<{
          txHash?: string; fee?: number; blockTime?: number; signer?: string
        }>>({
          module: "account", action: "transactions", address: resolvedAddress, limit: "50",
        })

        txCount = rawTxs.length
        for (const tx of rawTxs) {
          const val = (tx.fee || 0) / 1e9
          totalValue += val

          const counterparty = tx.signer || ""
          if (counterparty && counterparty.toLowerCase() !== resolvedAddress.toLowerCase()) {
            const existing = counterpartyMap.get(counterparty) || { txCount: 0, totalValue: 0 }
            existing.txCount++
            existing.totalValue += val
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

    const topCounterparties = [...counterpartyMap.entries()]
      .sort((a, b) => b[1].txCount - a[1].txCount)
      .slice(0, 10)
      .map(([addr, data]) => ({
        address: addr,
        txCount: data.txCount,
        totalValue: data.totalValue.toFixed(4),
      }))

    yield { step: "insights" as AnalysisStep, label: "AI generating insights", data: {} }
    let insights = ""
    let riskScore: "low" | "medium" | "high" = "low"
    let riskFlags: Array<{ label: string; severity: "info" | "warning" | "critical" }> = []

    try {
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
          temperature: 0.3,
          stream: false,
        }),
      })

      if (res.ok) {
        const json = await res.json() as {
          choices: Array<{ message: { content: string } }>
        }
        const content = json.choices?.[0]?.message?.content || ""
        const parsed = JSON.parse(content)
        riskScore = parsed.riskScore || "low"
        riskFlags = parsed.riskFlags || []
        insights = parsed.insights || ""
      }
    } catch {
      insights = "AI analysis unavailable. Showing raw data."
    }

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
