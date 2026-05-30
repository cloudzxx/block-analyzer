import { describe, it, expect, jest } from "bun:test"
import { createSolGetBalanceTool } from "./getBalance"
import { SolscanProvider } from "@ingest/adapters/solscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mc(): Config { return { LLM_API_KEY:"s",LLM_MODEL:"m",LLM_BASE_URL:"https://api.minimaxi.com/v1",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3030,FRONTEND_ORIGIN:"h"} }

describe("sol_getBalance", () => {
  it("returns SOL balance", async () => {
    const provider = new SolscanProvider("k")
    const cache = createCache()
    const tool = createSolGetBalanceTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { lamports: 5000000000 } }), { status: 200 })
    )
    const result = await tool.execute({ address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).lamports).toBe(5000000000)
    mockFetch.mockRestore()
  })
})
