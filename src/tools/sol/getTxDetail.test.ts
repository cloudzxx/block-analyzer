import { describe, it, expect, jest } from "bun:test"
import { createSolGetTxDetailTool } from "./getTxDetail"
import { SolscanProvider } from "../../providers/solscan"
import { createCache } from "../../cache/lru"
import type { Config } from "../../shared/config"

function mc(): Config { return { OPENAI_API_KEY:"s",OPENAI_MODEL:"m",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3000,FRONTEND_ORIGIN:"h"} }

describe("sol_getTxDetail", () => {
  it("returns tx detail", async () => {
    const provider = new SolscanProvider("k")
    const cache = createCache()
    const tool = createSolGetTxDetailTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { txHash: "5x...abc", blockTime: 1710000000, slot: 123456, fee: 5000, signer: ["s"], status: "Success" } }), { status: 200 })
    )
    const result = await tool.execute({ signature: "5x...abc123456789012345678901234567890123456789012" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    mockFetch.mockRestore()
  })
})
