import { ProviderError } from "../shared/errors"

interface PriceData {
  ethereum: number
  solana: number
}

export class CoinGeckoProvider {
  readonly name = "coingecko"
  private readonly baseUrl = "https://api.coingecko.com/api/v3"
  private cache: { data: PriceData; expiresAt: number } | null = null
  private readonly ttl = 60_000

  async getPrices(): Promise<PriceData> {
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

      this.cache = { data, expiresAt: Date.now() + this.ttl }
      return data
    } catch (err) {
      clearTimeout(timer)
      throw new ProviderError(`CoinGecko request failed: ${err}`)
    }
  }
}
