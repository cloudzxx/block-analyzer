export interface Config {
  LLM_API_KEY: string
  LLM_MODEL: string
  LLM_BASE_URL: string
  ETHERSCAN_API_KEY: string
  SOLSCAN_API_KEY: string
  PORT: number
  FRONTEND_ORIGIN: string
}

function env(key: string, alias?: string): string | undefined {
  return process.env[key] || (alias ? process.env[alias] : undefined)
}

export function loadConfig(): Config {
  const apiKey = env("LLM_API_KEY", "OPENAI_API_KEY")
  if (!apiKey) throw new Error("Missing LLM API key: set LLM_API_KEY")
  const ethKey = process.env.ETHERSCAN_API_KEY
  if (!ethKey) throw new Error("Missing ETHERSCAN_API_KEY")
  const solKey = process.env.SOLSCAN_API_KEY
  if (!solKey) throw new Error("Missing SOLSCAN_API_KEY")

  const port = parseInt(process.env.PORT || "3000", 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`)
  }
  return {
    LLM_API_KEY: apiKey,
    LLM_MODEL: env("LLM_MODEL", "OPENAI_MODEL") || "gpt-4o",
    LLM_BASE_URL: env("LLM_BASE_URL", "OPENAI_BASE_URL") || "https://api.openai.com/v1",
    ETHERSCAN_API_KEY: ethKey,
    SOLSCAN_API_KEY: solKey,
    PORT: port,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  }
}
