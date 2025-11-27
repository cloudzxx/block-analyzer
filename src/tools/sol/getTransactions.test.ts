import { describe, it, expect, jest } from "bun:test"
import { createSolGetTransactionsTool } from "./getTransactions"
import { SolscanProvider } from "../../providers/solscan"
import { createCache } from "../../cache/lru"
import type { Config } from "../../shared/config"

function mc(): Config { return { LLM_API_KEY:"s",LLM_MODEL:"m",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3000, LLM_BASE_URL: "https://api.openai.com/v1",FRONTEND_ORIGIN:"h"} }

describe("sol_getTransactions", () => {
  it("returns tx list", async () => {
    const provider = new SolscanProvider("k")
    const cache = createCache()
    const tool = createSolGetTransactionsTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [{ txHash: "5x...abc", blockTime: 1710000000, slot: 123456, fee: 5000, signer: ["s"], status: "Success" }] }), { status: 200 })
    )
    const result = await tool.execute({ address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[])[0].txHash).toBe("5x...abc")
    mockFetch.mockRestore()
  })
})
