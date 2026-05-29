import { describe, it, expect, beforeEach, jest } from "bun:test"
import { EtherscanProvider } from "./etherscan"

describe("EtherscanProvider", () => {
  let provider: EtherscanProvider

  beforeEach(() => {
    provider = new EtherscanProvider("test-key")
  })

  it("has correct name", () => {
    expect(provider.name).toBe("etherscan")
  })

  it("fetches account balance", async () => {
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        status: "1",
        message: "OK",
        result: "1000000000000000000"
      }), { status: 200 })
    )

    const result = await provider.request<string>({
      module: "account",
      action: "balance",
      address: "0x742d35Cc6634C0532925a3b844b5d0f1c0a4c1e0",
      tag: "latest",
    })
    expect(result).toBe("1000000000000000000")
    mockFetch.mockRestore()
  })

  it("throws ProviderError on API error", async () => {
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        status: "0",
        message: "NOTOK",
        result: "Invalid address format"
      }), { status: 200 })
    )

    await expect(
      provider.request({ module: "account", action: "balance", address: "bad" })
    ).rejects.toThrow("Etherscan API error")
    mockFetch.mockRestore()
  })
})
