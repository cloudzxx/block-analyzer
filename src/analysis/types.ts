export interface AnalysisReport {
  address: string
  resolvedAddress: string
  label?: string
  chain: string
  analysisType: string
  timestamp: number
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
