import { describe, it, expect, jest } from "bun:test"
import { createResolveENSTool } from "./resolveENS"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mockConfig(): Config {
  return { LLM_API_KEY: "s", LLM_MODEL: "m", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "h" }
}

describe("resolveENS", () => {
  it("resolves ENS name to address", async () => {
    const cache = createCache()
    const tool = createResolveENSTool(cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", displayName: "vitalik.eth" }), { status: 200 })
    )
    const result = await tool.execute({ name: "vitalik.eth" }, { config: mockConfig(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).address).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
    mockFetch.mockRestore()
  })

  it("returns error when neither name nor address provided", async () => {
    const cache = createCache()
    const tool = createResolveENSTool(cache)
    const result = await tool.execute({}, { config: mockConfig(), cache })
    expect(result.success).toBe(false)
    expect(result.error).toContain("Provide either a name")
  })
})
