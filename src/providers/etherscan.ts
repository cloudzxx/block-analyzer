import type { Provider } from "./types"
import { ProviderError } from "../shared/errors"

interface EtherscanResponse<T> {
  status: string
  message: string
  result: T
}

export class EtherscanProvider implements Provider {
  readonly name = "etherscan"
  private readonly baseUrl = "https://api.etherscan.io/api"

  constructor(private readonly apiKey: string) {}

  async request<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl)
    url.searchParams.set("apikey", this.apiKey)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    const res = await fetchWithRetry(url.toString())
    const data: EtherscanResponse<T> = await res.json()

    if (data.status === "0" || data.message === "NOTOK") {
      throw new ProviderError(
        `Etherscan API error: ${JSON.stringify(data.result)}`
      )
    }

    return data.result
  }
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(url, { signal: controller.signal })
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
        throw new ProviderError(`Etherscan request failed after ${retries} retries: ${err}`)
      }
      const delay = Math.pow(2, i) * 1000
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new ProviderError("Etherscan request failed: max retries exceeded")
}
