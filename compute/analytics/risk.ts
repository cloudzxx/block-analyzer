import type { AnalysisReport } from "./types"

// Tornado Cash pool addresses on Ethereum mainnet
// Source: OFAC SDN list (sanctions imposed Aug 8, 2022)
// Stored lowercase for case-insensitive matching
const TORNADO_CASH_ADDRESSES = new Set<string>([
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", // Router
  "0x722122df12d4e14e13ac3b6895a86e84145b6967", // Proxy
  "0xdd4c48c0b24039969fc16d1cdf626eab821d3384", // 0.1 ETH
  "0x47ce0c6edac2b0a10c9c4d657afaef5f1b1e5e58", // 1 ETH
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf", // 10 ETH
  "0xa160cdab225685da1d56aa342ad8841c3b53f291", // 100 ETH
  "0xd4b88df4d29f5cedd6857912842cff3b20c8cea7", // 100 DAI
  "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144", // 1000 DAI
  "0x07687e702b410fa43f4cb4af7fa097918ffd2730", // 10000 DAI
  "0x23773e65ed146a459667ed0d9043d799d992da3b", // 100000 DAI
  "0xd96f2b1c14db8458374d9aca76e26c3950c82a43", // 100 USDC
  "0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfba9d", // 1000 USDC
  "0x178169b1eca2c48d9b19c21e2f649c8f40de45b",  // 0.1 WBTC
  "0x610b717796ad172b316836ac95a2ffad065ceab4", // 1 WBTC
  "0xbb93e510bbcd0b7beb5a853875f9ec60275cf498", // 10 WBTC
])

// pump.fun bonding curve program — Solana mainnet
// Deploys meme tokens via algorithmic bonding curve; migrates to Raydium at threshold.
// High speculation / rug risk; many tokens launched here have zero long-term value.
const PUMP_FUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"

// Additional Solana high-risk program set (expandable)
const SOL_HIGH_RISK_PROGRAMS = new Set<string>([
  PUMP_FUN_PROGRAM,
  // Moonshot (another meme launchpad)
  "MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG",
])

export interface RiskInput {
  chain: string
  resolvedAddress: string
  accountType?: AnalysisReport["accountType"]
  topCounterparties: Array<{ address: string; txCount: number; totalValue: string }>
  programActivity?: Array<{ programId: string; label: string; count: number }>
  dustSenderCount: number
  txCount: number
}

export interface RiskResult {
  score: "low" | "medium" | "high"
  flags: Array<{ label: string; severity: "info" | "warning" | "critical" }>
}

const SCORE_ORDER: Record<"low" | "medium" | "high", number> = { low: 0, medium: 1, high: 2 }

export function assessDeterministicRisk(input: RiskInput): RiskResult {
  const flags: Array<{ label: string; severity: "info" | "warning" | "critical" }> = []
  let scoreLevel = 0

  const { chain, resolvedAddress, accountType, topCounterparties, programActivity, dustSenderCount, txCount } = input

  if (chain === "ethereum") {
    // Rule 1: Target address is itself a Tornado Cash pool
    if (TORNADO_CASH_ADDRESSES.has(resolvedAddress.toLowerCase())) {
      flags.push({ label: "Address is a Tornado Cash pool (OFAC sanctioned)", severity: "critical" })
      scoreLevel = Math.max(scoreLevel, SCORE_ORDER.high)
    }

    // Rule 2: Any top counterparty is a Tornado Cash pool
    const tcCounterparties = topCounterparties.filter(c =>
      TORNADO_CASH_ADDRESSES.has(c.address.toLowerCase())
    )
    if (tcCounterparties.length > 0) {
      const totalTcInteractions = tcCounterparties.reduce((s, c) => s + c.txCount, 0)
      flags.push({
        label: `Mixer interaction: ${totalTcInteractions} tx with Tornado Cash pool${tcCounterparties.length > 1 ? "s" : ""} (OFAC sanctioned)`,
        severity: "critical",
      })
      scoreLevel = Math.max(scoreLevel, SCORE_ORDER.high)
    }

    // Rule 3: Dust attack — many unique senders each with < 0.001 ETH
    // Dusting attacks send tiny amounts to link wallet identities on-chain
    if (dustSenderCount >= 5) {
      flags.push({
        label: `Potential dust attack: ${dustSenderCount} unique addresses sent < 0.001 ETH — wallet may be targeted for de-anonymization`,
        severity: "warning",
      })
      scoreLevel = Math.max(scoreLevel, SCORE_ORDER.medium)
    } else if (dustSenderCount >= 2) {
      flags.push({
        label: `${dustSenderCount} micro-transfers (< 0.001 ETH) detected — possible dust attempt`,
        severity: "info",
      })
    }

    // Rule 4: Unverified contract with significant activity
    if (accountType?.type === "contract" && accountType.isVerified === false && txCount > 10) {
      flags.push({
        label: "Unverified smart contract with significant activity — source code not public, higher execution risk",
        severity: "warning",
      })
      scoreLevel = Math.max(scoreLevel, SCORE_ORDER.medium)
    }
  }

  if (chain === "solana") {
    // Rule 5: pump.fun interaction — meme token speculation
    const pumpActivity = programActivity?.find(p => p.programId === PUMP_FUN_PROGRAM)
    if (pumpActivity) {
      flags.push({
        label: `pump.fun activity: ${pumpActivity.count} interactions — meme token speculation, high rug-pull exposure`,
        severity: "warning",
      })
      scoreLevel = Math.max(scoreLevel, SCORE_ORDER.medium)
    }

    // Rule 6: Other known high-risk program interactions
    const otherHighRisk = programActivity?.filter(p =>
      SOL_HIGH_RISK_PROGRAMS.has(p.programId) && p.programId !== PUMP_FUN_PROGRAM
    ) || []
    for (const prog of otherHighRisk) {
      flags.push({
        label: `High-risk program interaction: ${prog.label} (${prog.count} calls)`,
        severity: "warning",
      })
      scoreLevel = Math.max(scoreLevel, SCORE_ORDER.medium)
    }
  }

  // Rule 7: Dormant account — no recent activity
  if (txCount === 0 && accountType?.type !== "program") {
    flags.push({ label: "No recent transaction activity — possibly dormant or cold wallet", severity: "info" })
  }

  return {
    score: (Object.keys(SCORE_ORDER) as Array<"low" | "medium" | "high">)[scoreLevel],
    flags,
  }
}

// Helper used in executor to merge deterministic score with LLM score (take maximum)
export function mergeRiskScore(
  a: "low" | "medium" | "high",
  b: "low" | "medium" | "high",
): "low" | "medium" | "high" {
  return SCORE_ORDER[a] >= SCORE_ORDER[b] ? a : b
}
