import { describe, it, expect, jest } from "bun:test"
import { createEthGetTxDetailTool } from "./getTxDetail"
import { EtherscanProvider } from "../../providers/etherscan"
import { createCache } from "../../cache/lru"
import type { Config } from "../../shared/config"

function mc(): Config { return { LLM_API_KEY:"s",LLM_MODEL:"m",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3000, LLM_BASE_URL: "https://api.openai.com/v1",FRONTEND_ORIGIN:"h"} }

describe("eth_getTxDetail", () => {
  it("returns tx detail for valid hash", async () => {
    const provider = new EtherscanProvider("k")
    const cache = createCache()
    const tool = createEthGetTxDetailTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK",
        result: { hash: "0xabc", from: "0xa", to: "0xb", value: "1000000000000000000", timeStamp: "1710000000", blockNumber: "12345", gas: "21000", gasPrice: "50000000000", input: "0x" }
      }), { status: 200 })
    )
    const result = await tool.execute({ txHash: "0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any).hash).toBe("0xabc")
    mockFetch.mockRestore()
  })
})
