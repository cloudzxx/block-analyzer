import type { Provider } from "./types"
import { ProviderError } from "@shared/errors"

// Etherscan V2 API 响应格式
interface EtherscanResponse<T> {
  status: string
  message: string
  result: T
}

// Etherscan 数据提供者：封装 V2 API 调用，自动添加 chainid 和 API Key
export class EtherscanProvider implements Provider {
  readonly name = "etherscan"
  private readonly baseUrl = "https://api.etherscan.io/v2/api"
  private readonly chainId: string

  constructor(private readonly apiKey: string, chainId?: string) {
    this.chainId = chainId || "1" // 默认主网
  }

  // 通用请求方法：接收模块/动作参数，返回解析后的数据
  async request<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl)
    // V2 API 要求 chainid 参数
    url.searchParams.set("chainid", this.chainId)
    url.searchParams.set("apikey", this.apiKey)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    const res = await fetchWithRetry(url.toString())
    const data: EtherscanResponse<T> = await res.json()

    // Etherscan 返回 status="0" 表示请求失败
    if (data.status === "0" || data.message === "NOTOK") {
      throw new ProviderError(
        `Etherscan API error: ${JSON.stringify(data.result)}`
      )
    }

    return data.result
  }
}

// 带指数退避重试的 fetch 封装（最多 3 次）
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)

      // 429（频率限制）时重试，退避时间指数增长：1s, 2s, 4s
      if (res.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      if (i === retries - 1) {
        throw new ProviderError(`Etherscan request failed after ${retries} retries: ${err}`)
      }
      const delay = Math.pow(2, i) * 1000
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new ProviderError("Etherscan request failed: max retries exceeded")
}
