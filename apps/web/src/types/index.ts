export type Chain = "ethereum" | "solana"

export interface Session {
  id: string
  title: string
  created_at: string
}

export interface SavedAddress {
  id: string
  label: string
  address: string
  chain: Chain
}

export interface QuickAction {
  id: string
  icon: string
  label: string
  prompt: (input?: string) => string
}

export interface ToolCallInfo {
  name: string
  args: string
  result: string
  status: "running" | "done" | "error"
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolCallInfo[]
}

export interface QueryTemplate {
  icon: string
  title: string
  description: string
  prompt: string
}

export interface ToolInfo {
  name: string
  description: string
  chain: Chain | "common"
  example: string
}

export interface AnalysisReport {
  address: string
  resolvedAddress: string
  label?: string
  chain: string
  analysisType: string
  timestamp: number
  accountType?: {
    type: string
    contractName?: string
    isVerified?: boolean
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
    ethTransferVolume?: string
    topTokens?: Array<{ symbol: string; contractAddress: string; transferCount: number }>
    programActivity?: Array<{ programId: string; label: string; count: number }>
    tokenTransferVolume?: string
  }
  risk: {
    score: "low" | "medium" | "high"
    flags: Array<{ label: string; severity: "info" | "warning" | "critical" }>
  }
  insights: string
}

export interface AnalysisProgress {
  step: string
  label: string
  status: "pending" | "running" | "done"
}
