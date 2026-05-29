import { describe, it, expect, beforeEach, jest } from "bun:test"
import { CoinGeckoProvider } from "./coingecko"

describe("CoinGeckoProvider", () => {
  let provider: CoinGeckoProvider

  beforeEach(() => {
    provider = new CoinGeckoProvider()
  })

  it("fetches ETH and SOL prices", async () => {
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        ethereum: { usd: 3500.42 },
        solana: { usd: 180.15 },
      }), { status: 200 })
    )

    const prices = await provider.getPrices()
    expect(prices.ethereum).toBe(3500.42)
    expect(prices.solana).toBe(180.15)
    mockFetch.mockRestore()
  })

  it("returns cached prices on second call within TTL", async () => {
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        ethereum: { usd: 3500 },
        solana: { usd: 180 },
      }), { status: 200 })
    )

    await provider.getPrices()
    const prices2 = await provider.getPrices()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    mockFetch.mockRestore()
  })
})
