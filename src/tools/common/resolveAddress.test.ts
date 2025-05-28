import { describe, it, expect } from "bun:test"
import { createResolveAddressTool } from "./resolveAddress"
import { createCache } from "../../cache/lru"
import type { Config } from "../../shared/config"

function mc(): Config { return { OPENAI_API_KEY:"s",OPENAI_MODEL:"m",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3000,FRONTEND_ORIGIN:"h"} }

describe("resolveAddress", () => {
  it("detects Ethereum address", async () => {
    const cache = createCache()
    const tool = createResolveAddressTool(cache)
    const result = await tool.execute({ input: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).chain).toBe("ethereum")
  })
  it("detects Solana address", async () => {
    const cache = createCache()
    const tool = createResolveAddressTool(cache)
    const result = await tool.execute({ input: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).chain).toBe("solana")
  })
  it("returns error for unrecognized", async () => {
    const cache = createCache()
    const tool = createResolveAddressTool(cache)
    const result = await tool.execute({ input: "not-an-address" }, { config: mc(), cache })
    expect(result.success).toBe(false)
  })
})
