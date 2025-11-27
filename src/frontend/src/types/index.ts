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

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "balance", icon: "💰", label: "Balance", prompt: (a) => `Check balance of ${a || "an address"}` },
  { id: "txs", icon: "📊", label: "Transactions", prompt: (a) => `Show recent transactions for ${a || "an address"}` },
  { id: "price", icon: "💹", label: "Price", prompt: () => "What's the current ETH price?" },
  { id: "whale", icon: "🐋", label: "Whale Alert", prompt: () => "Show me large transactions in the last 24h" },
  { id: "resolve", icon: "🔍", label: "Resolve", prompt: (a) => `Resolve ${a || "an ENS name or address"}` },
  { id: "compare", icon: "⚖️", label: "Compare", prompt: () => "Compare gas prices on ETH and SOL" },
]

export const QUERY_TEMPLATES: QueryTemplate[] = [
  { icon: "💰", title: "Check ETH Balance", description: "Query any Ethereum address balance", prompt: "Check balance of vitalik.eth" },
  { icon: "📊", title: "Recent Transactions", description: "Last 20 transactions for an address", prompt: "Show recent transactions for vitalik.eth" },
  { icon: "💹", title: "ETH Price", description: "Current ETH price in USD", prompt: "What's the current ETH price?" },
  { icon: "🐋", title: "Whale Watch", description: "Find large transfers", prompt: "Show me transactions over 1000 ETH in the last 24h" },
  { icon: "🔍", title: "Resolve ENS", description: "Resolve .eth name to address", prompt: "Resolve vitalik.eth" },
  { icon: "⛓️", title: "Compare Chains", description: "Compare gas/performance", prompt: "Compare gas prices on Ethereum and Solana" },
]

export const CAPABILITIES: ToolInfo[] = [
  { name: "eth_getBalance", description: "Get ETH balance for an address", chain: "ethereum", example: "0x742d35Cc6634C0532925a3b844Bc4a1b4f8c1b5e" },
  { name: "eth_getTransactions", description: "List recent transactions", chain: "ethereum", example: "0x742d35Cc6634C0532925a3b844Bc4a1b4f8c1b5e" },
  { name: "eth_getTxDetail", description: "Get transaction details by hash", chain: "ethereum", example: "0xabc..." },
  { name: "sol_getBalance", description: "Get SOL balance for an address", chain: "solana", example: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuKvCKBHfFJb1A" },
  { name: "sol_getTransactions", description: "List recent Solana transactions", chain: "solana", example: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuKvCKBHfFJb1A" },
  { name: "sol_getTxDetail", description: "Get Solana transaction details", chain: "solana", example: "5zV..." },
  { name: "resolveAddress", description: "Resolve ENS/address to canonical form", chain: "common", example: "vitalik.eth" },
  { name: "getEthPrice", description: "Get current ETH price in USD", chain: "common", example: "current price" },
]
