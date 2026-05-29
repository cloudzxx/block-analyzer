import type { Provider } from "./types"
import { ProviderError } from "../shared/errors"

// Solscan API 响应格式
interface SolscanResponse<T> {
  success: boolean
  data?: T
  errors?: { message: string }[]
}

// Solscan 数据提供者：根据 module/action 参数路由到不同 REST 端点
export class SolscanProvider implements Provider {
  readonly name = "solscan"
  private readonly baseUrl = "https://public-api.solscan.io"

  constructor(private readonly apiKey: string) {}

  // 通用请求方法：将参数路由到正确的端点
  async request<T>(params: Record<string, string>): Promise<T> {
    let url: string

    // 根据 module + action 路由到不同 API 路径
    if (params.module === "account" && params.action === "info") {
      url = `${this.baseUrl}/account/${params.address}`
    } else if (params.module === "account" && params.action === "transactions") {
      url = `${this.baseUrl}/account/transactions?account=${params.address}&limit=${params.limit || "20"}`
    } else if (params.module === "account" && params.action === "tokens") {
      url = `${this.baseUrl}/account/tokens?address=${params.address}`
    } else if (params.module === "token" && params.action === "holders") {
      url = `${this.baseUrl}/token/holders?tokenAddress=${params.tokenAddress}&limit=${params.limit || "20"}`
    } else if (params.module === "transaction" && params.action === "detail") {
      url = `${this.baseUrl}/transaction/${params.signature}`
    } else {
      // 兜底：拼装通用 URL
      url = `${this.baseUrl}/${params.module}/${params.action}?${new URLSearchParams(params).toString()}`
    }

    const res = await fetchWithRetry(url, this.apiKey)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const errMsg = (body as SolscanResponse<unknown>).errors?.[0]?.message || `HTTP ${res.status}`
      throw new ProviderError(`Solscan API error: ${errMsg}`)
    }

    const json: SolscanResponse<T> = await res.json()
    // Solscan 通过 success 字段标识请求是否成功
    if (!json.success || !json.data) {
      throw new ProviderError(`Solscan API error: ${json.errors?.[0]?.message || "Unknown error"}`)
    }

    return json.data
  }
}

// 带重试的 fetch 封装（Solscan 使用 token 认证头）
async function fetchWithRetry(url: string, apiKey: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "token": apiKey }, // Solscan API Key 放在 token 请求头
      })
      clearTimeout(timer)

      if (res.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      if (i === retries - 1) {
        throw new ProviderError(`Solscan request failed after ${retries} retries: ${err}`)
      }
      const delay = Math.pow(2, i) * 1000
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new ProviderError("Solscan request failed: max retries exceeded")
}
