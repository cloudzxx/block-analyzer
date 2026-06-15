export interface AnalysisReport {
  address: string
  resolvedAddress: string
  label?: string
  chain: string
  analysisType: string
  timestamp: number
  accountType?: {
    // ETH: "eoa" | "contract"; Solana: "wallet" | "program" | "token_account" | "stake_account" | "unknown"
    type: string
    // ETH contract extra
    contractName?: string
    isVerified?: boolean
    // Solana extra
    ownerProgram?: string
    ownerLabel?: string
  }
  balance: {
    value: string
    unit: string
    usdValue: string | null
  }
  transactions: {
    count: number
    timeRange: { start: string; end: string } | null
    topCounterparties: Array<{
      address: string
      txCount: number
      totalValue: string
    }>
    // ETH: native ETH transfer volume
    ethTransferVolume?: string
    // ETH: top ERC-20 tokens by transfer count
    topTokens?: Array<{ symbol: string; contractAddress: string; transferCount: number }>
    // Solana: parsed program activity breakdown
    programActivity?: Array<{ programId: string; label: string; count: number }>
    // Solana: actual token transfer volume (SOL equivalent)
    tokenTransferVolume?: string
  }
  // ETH: MEV / private order flow classification
  mev?: {
    // "none" | "protected_user" | "mev_active" | "searcher_bot"
    classification: string
    privateTxCount: number
    multiTxBlockCount: number
    topOfBlockCount: number
    failedRatio: number
  }
  risk: {
    score: "low" | "medium" | "high"
    flags: Array<{ label: string; severity: "info" | "warning" | "critical" }>
  }
  insights: string
}

export type AnalysisStep =
  | "resolve"
  | "balance"
  | "transactions"
  | "insights"

export interface AnalysisStepResult {
  step: AnalysisStep
  label: string
  data: Record<string, unknown>
}

export interface AnalysisEvent {
  type: "step_start" | "step_result" | "report" | "error" | "done"
  data: AnalysisStepResult | { report: AnalysisReport } | { message: string } | Record<string, never>
}
