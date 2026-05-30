import type { Provider } from "./types"
import { ProviderError } from "@shared/errors"

// Solscan API 响应格式
interface SolscanResponse<T> {
  success: boolean
  data?: T
  errors?: { message: string }[]
}

// Solscan 数据提供者：根据 module/action 参数路由到不同 REST 端点
// 使用 Pro API v2.0（旧版 public-api.solscan.io 已弃用）
export class SolscanProvider implements Provider {
  readonly name = "solscan"
  private readonly baseUrl = "https://pro-api.solscan.io/v2.0"
  private readonly cluster: string

  constructor(private readonly apiKey: string, cluster?: string) {
    this.cluster = cluster || "mainnet"
  }

  // 通用请求方法：将参数路由到正确的端点
  async request<T>(params: Record<string, string>): Promise<T> {
    let url: string

    // 根据 module + action 路由到不同 API 路径（Pro API v2.0 格式）
    if (params.module === "account" && params.action === "info") {
      url = `${this.baseUrl}/account/detail?address=${params.address}&cluster=${this.cluster}`
    } else if (params.module === "account" && params.action === "transactions") {
      const limit = snapLimit(params.limit || "20")
      url = `${this.baseUrl}/account/transactions?address=${params.address}&limit=${limit}&cluster=${this.cluster}`
    } else if (params.module === "account" && params.action === "transfer") {
      const pageSize = snapLimit(params.limit || "20")
      url = `${this.baseUrl}/account/transfer?address=${params.address}&page_size=${pageSize}&exclude_amount_zero=true&cluster=${this.cluster}`
    } else if (params.module === "account" && params.action === "tokens") {
      url = `${this.baseUrl}/account/token-accounts?address=${params.address}&type=token&page_size=40&hide_zero=true&cluster=${this.cluster}`
    } else if (params.module === "token" && params.action === "holders") {
      url = `${this.baseUrl}/token/holders?address=${params.tokenAddress}&page_size=${params.limit || "20"}&cluster=${this.cluster}`
    } else if (params.module === "transaction" && params.action === "detail") {
      url = `${this.baseUrl}/transaction/detail?tx=${params.signature}&cluster=${this.cluster}`
    } else {
      url = `${this.baseUrl}/${params.module}/${params.action}?${new URLSearchParams(params).toString()}&cluster=${this.cluster}`
    }

    const res = await fetchWithRetry(url, this.apiKey)

    if (!res.ok) {
      const body: Record<string, unknown> | null = await res.json().catch(() => null)
      const errMsg = (body as SolscanResponse<unknown>)?.errors?.[0]?.message || `HTTP ${res.status}`
      throw new ProviderError(`Solscan API error: ${errMsg}`)
    }

    const responseBody: unknown = await res.json().catch(() => null)
    if (!responseBody) {
      throw new ProviderError("Solscan API error: empty response")
    }
    const json = responseBody as SolscanResponse<T>
    // Solscan 通过 success 字段标识请求是否成功
    if (!json.success || !json.data) {
      throw new ProviderError(`Solscan API error: ${json.errors?.[0]?.message || "Unknown error"}`)
    }

    // Pro API v2.0 返回 snake_case，转换为 camelCase 以兼容现有工具
    return normalizeKeys(json.data) as T
  }
}

// Pro API 的 limit 只接受 10/20/30/40，向上取整到最近的合法值
function snapLimit(v: string): string {
  const n = Math.min(parseInt(v, 10) || 20, 40)
  if (n <= 10) return "10"
  if (n <= 20) return "20"
  if (n <= 30) return "30"
  return "40"
}

// 递归将对象 key 从 snake_case 转换为 camelCase
// Pro API v2.0 返回 snake_case，工具代码使用 camelCase
function normalizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeKeys)
  }
  if (value && typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      result[camel] = normalizeKeys(v)
    }
    return result
  }
  return value
}

// 带重试的 fetch 封装（Solscan Pro API v2.0 使用 Bearer token 认证）
async function fetchWithRetry(url: string, apiKey: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "Authorization": `Bearer ${apiKey}` }, // Pro API v2.0 Bearer 认证
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
