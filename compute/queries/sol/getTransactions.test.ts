import { describe, it, expect, jest } from "bun:test"
import { createSolGetTransactionsTool } from "./getTransactions"
import { SolscanProvider } from "@ingest/adapters/solscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mc(): Config { return { LLM_API_KEY:"s",LLM_MODEL:"m",LLM_BASE_URL:"https://api.minimaxi.com/v1",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3030,FRONTEND_ORIGIN:"h"} }

describe("sol_getTransactions", () => {
  it("returns tx list", async () => {
    const provider = new SolscanProvider("k")
    const cache = createCache()
    const tool = createSolGetTransactionsTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [{ tx_hash: "5x...abc", block_time: 1710000000, block_id: 123456, fee: 5000, signer: "s", status: 1 }] }), { status: 200 })
    )
    const result = await tool.execute({ address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[])[0].txHash).toBe("5x...abc")
    mockFetch.mockRestore()
  })
})
