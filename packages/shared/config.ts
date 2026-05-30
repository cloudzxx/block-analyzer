// 应用配置接口：所有环境变量在此定义类型
export interface Config {
  LLM_API_KEY: string      // LLM 提供商的 API Key（如 MiniMax）
  LLM_MODEL: string        // 模型名称
  LLM_BASE_URL: string     // OpenAI 兼容的 API 基础 URL
  ETHERSCAN_API_KEY: string
  ETHERSCAN_CHAIN_ID: string // Ethereum 链 ID（默认 Sepolia 测试网）
  SOLSCAN_API_KEY: string
  SOLSCAN_CLUSTER: string    // Solana 集群（mainnet/testnet/devnet）
  PORT: number             // 服务端口（默认 3030，因 3000 被系统 Next.js 占用）
  FRONTEND_ORIGIN: string  // 前端开发服务器地址（CORS 用）
}

// 从环境变量加载配置，缺失必填项时直接抛出异常
export function loadConfig(): Config {
  const required = ["LLM_API_KEY", "ETHERSCAN_API_KEY", "SOLSCAN_API_KEY"] as const
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env variable: ${key}`)
    }
  }
  // 校验端口号合法性
  const port = parseInt(process.env.PORT || "3030", 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`)
  }
  return {
    LLM_API_KEY: process.env.LLM_API_KEY!,
    LLM_MODEL: process.env.LLM_MODEL || "MiniMax-M2.7",
    LLM_BASE_URL: process.env.LLM_BASE_URL || "https://api.minimaxi.com/v1",
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY!,
    ETHERSCAN_CHAIN_ID: process.env.ETHERSCAN_CHAIN_ID || "1", // 主网
    SOLSCAN_API_KEY: process.env.SOLSCAN_API_KEY!,
    SOLSCAN_CLUSTER: process.env.SOLSCAN_CLUSTER || "mainnet",
    PORT: port,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  }
}
