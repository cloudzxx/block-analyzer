export interface Config {
  LLM_API_KEY: string
  LLM_MODEL: string
  LLM_BASE_URL: string
  ETHERSCAN_API_KEY: string
  SOLSCAN_API_KEY: string
  PORT: number
  FRONTEND_ORIGIN: string
}

export function loadConfig(): Config {
  const required = ["LLM_API_KEY", "ETHERSCAN_API_KEY", "SOLSCAN_API_KEY"] as const
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env variable: ${key}`)
    }
  }
  const port = parseInt(process.env.PORT || "3030", 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`)
  }
  return {
    LLM_API_KEY: process.env.LLM_API_KEY!,
    LLM_MODEL: process.env.LLM_MODEL || "MiniMax-M2.7",
    LLM_BASE_URL: process.env.LLM_BASE_URL || "https://api.minimaxi.com/v1",
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY!,
    SOLSCAN_API_KEY: process.env.SOLSCAN_API_KEY!,
    PORT: port,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  }
}
