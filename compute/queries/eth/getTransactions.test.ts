import { describe, it, expect, jest } from "bun:test"
import { createEthGetTransactionsTool } from "./getTransactions"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { createCache } from "@storage/cache/lru"
import type { Config } from "@shared/config"

function mc(): Config { return { LLM_API_KEY:"s",LLM_MODEL:"m",LLM_BASE_URL:"https://api.minimaxi.com/v1",ETHERSCAN_API_KEY:"e",SOLSCAN_API_KEY:"s",PORT:3030,FRONTEND_ORIGIN:"h"} }

describe("eth_getTransactions", () => {
  it("enriches transactions with ether values", async () => {
    const provider = new EtherscanProvider("k")
    const cache = createCache()
    const tool = createEthGetTransactionsTool(provider, cache)
    const mockFetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "1", message: "OK",
        result: [{ hash: "0xabc", from: "0xa", to: "0xb", value: "2000000000000000000", timeStamp: "1710000000", blockNumber: "1", gas: "21000", gasPrice: "50000000000" }]
      }), { status: 200 })
    )
    const result = await tool.execute({ address: "0x742d35Cc6634C0532925a3b844b5d0f1c0a4c1e0" }, { config: mc(), cache })
    expect(result.success).toBe(true)
    expect((result.data as any[])[0].hash).toBe("0xabc")
    mockFetch.mockRestore()
  })
})
