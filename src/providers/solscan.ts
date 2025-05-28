import type { Provider } from "./types"
import { ProviderError } from "../shared/errors"

interface SolscanResponse<T> {
  success: boolean
  data?: T
  errors?: { message: string }[]
}

export class SolscanProvider implements Provider {
  readonly name = "solscan"
  private readonly baseUrl = "https://public-api.solscan.io"

  constructor(private readonly apiKey: string) {}

  async request<T>(params: Record<string, string>): Promise<T> {
    let url: string

    if (params.module === "account" && params.action === "info") {
      url = `${this.baseUrl}/account/${params.address}`
    } else if (params.module === "account" && params.action === "transactions") {
      url = `${this.baseUrl}/account/transactions?account=${params.address}&limit=${params.limit || "20"}`
    } else if (params.module === "transaction" && params.action === "detail") {
      url = `${this.baseUrl}/transaction/${params.signature}`
    } else {
      url = `${this.baseUrl}/${params.module}/${params.action}?${new URLSearchParams(params).toString()}`
    }

    const res = await fetchWithRetry(url, this.apiKey)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const errMsg = (body as SolscanResponse<unknown>).errors?.[0]?.message || `HTTP ${res.status}`
      throw new ProviderError(`Solscan API error: ${errMsg}`)
    }

    const json: SolscanResponse<T> = await res.json()
    if (!json.success || !json.data) {
      throw new ProviderError(`Solscan API error: ${json.errors?.[0]?.message || "Unknown error"}`)
    }

    return json.data
  }
}

async function fetchWithRetry(url: string, apiKey: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "token": apiKey },
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
