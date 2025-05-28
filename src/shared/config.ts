export interface Config {
  OPENAI_API_KEY: string
  OPENAI_MODEL: string
  ETHERSCAN_API_KEY: string
  SOLSCAN_API_KEY: string
  PORT: number
  FRONTEND_ORIGIN: string
}

export function loadConfig(): Config {
  const required = ["OPENAI_API_KEY", "ETHERSCAN_API_KEY", "SOLSCAN_API_KEY"] as const
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env variable: ${key}`)
    }
  }
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o",
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY!,
    SOLSCAN_API_KEY: process.env.SOLSCAN_API_KEY!,
    PORT: parseInt(process.env.PORT || "3000", 10),
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  }
}
