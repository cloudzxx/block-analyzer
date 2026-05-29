import { describe, it, expect, jest } from "bun:test"
import express from "express"
import { createAnalysisRouter } from "./analysis"
import { AnalysisExecutor } from "../../../../compute/analytics/executor"
import { createCache } from "../../../../storage/cache/lru"
import type { Config } from "../../../../packages/shared/config"

function mc(): Config {
  return { LLM_API_KEY: "sk", LLM_MODEL: "MiniMax-M2.7", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "k", SOLSCAN_API_KEY: "k", PORT: 3030, FRONTEND_ORIGIN: "http://localhost:5173" }
}

describe("POST /api/analyze", () => {
  it("returns 400 when address is missing", async () => {
    const executor = new AnalysisExecutor(mc(), createCache())
    const router = createAnalysisRouter(executor)
    const app = express()
    app.use(express.json())
    app.use("/api", router)

    const server = app.listen(0)
    const port = (server.address() as any).port
    const res = await fetch(`http://localhost:${port}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    server.close()
  })

  it("returns SSE stream for valid address", async () => {
    const executor = new AnalysisExecutor(mc(), createCache())
    jest.spyOn(executor, "analyze").mockImplementation(async function* () {
      yield { step: "resolve" as const, label: "Resolving address", data: {} }
      yield { step: "balance" as const, label: "Fetching balance", data: { value: "1.5", unit: "ETH" } }
      yield { type: "report", report: { address: "test.eth", resolvedAddress: "0x123", chain: "ethereum", analysisType: "wallet", timestamp: Date.now(), balance: { value: "1.5", unit: "ETH", usdValue: "4500" }, transactions: { count: 10, timeRange: null, topCounterparties: [] }, risk: { score: "low", flags: [] }, insights: "Test analysis" } }
    })

    const router = createAnalysisRouter(executor)
    const app = express()
    app.use(express.json())
    app.use("/api", router)

    const server = app.listen(0)
    const port = (server.address() as any).port
    const res = await fetch(`http://localhost:${port}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: "test.eth", chain: "ethereum" }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const body = await res.text()
    expect(body).toContain("event: step_start")
    expect(body).toContain("event: report")
    expect(body).toContain("event: done")
    server.close()
  })
})
