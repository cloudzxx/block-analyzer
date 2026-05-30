import { ProviderError } from "@shared/errors"

// CoinGecko 价格查询接口
interface PriceData {
  ethereum: number
  solana: number
}

// CoinGecko 价格提供者：获取 ETH/SOL 的 USD 价格，带 60s 缓存
export class CoinGeckoProvider {
  readonly name = "coingecko"
  private readonly baseUrl = "https://api.coingecko.com/api/v3"
  // 内存缓存，避免频繁调用 CoinGecko API
  private cache: { data: PriceData; expiresAt: number } | null = null
  private readonly ttl = 60_000 // 60 秒缓存

  async getPrices(): Promise<PriceData> {
    // 缓存命中且未过期，直接返回
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data
    }

    const url = `${this.baseUrl}/simple/price?ids=ethereum,solana&vs_currencies=usd`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) {
        throw new ProviderError(`CoinGecko API error: HTTP ${res.status}`)
      }

      const json = await res.json()
      const data: PriceData = {
        ethereum: json.ethereum?.usd || 0,
        solana: json.solana?.usd || 0,
      }

      // 写入缓存
      this.cache = { data, expiresAt: Date.now() + this.ttl }
      return data
    } catch (err) {
      clearTimeout(timer)
      throw new ProviderError(`CoinGecko request failed: ${err}`)
    }
  }
}
