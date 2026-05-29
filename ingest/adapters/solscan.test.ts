import { describe, it, expect, beforeEach, jest } from "bun:test"
import { SolscanProvider } from "./solscan"

describe("SolscanProvider", () => {
  let provider: SolscanProvider

  beforeEach(() => {
    provider = new SolscanProvider("test-key")
  })

  it("has correct name", () => {
    expect(provider.name).toBe("solscan")
  })

  it("fetches account info", async () => {
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          account: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
          lamports: 5000000000,
        }
      }), { status: 200 })
    )

    const result = await provider.request<{ account: string; lamports: number }>({
      module: "account",
      action: "info",
      address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    })
    expect(result.lamports).toBe(5000000000)
    mockFetch.mockRestore()
  })

  it("throws ProviderError on failed request", async () => {
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        success: false,
        errors: [{ message: "Account not found" }]
      }), { status: 400 })
    )

    await expect(
      provider.request({ module: "account", action: "info", address: "bad" })
    ).rejects.toThrow("Solscan API error")
    mockFetch.mockRestore()
  })
})
