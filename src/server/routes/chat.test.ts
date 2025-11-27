import { describe, it, expect, jest } from "bun:test"
import express from "express"
import { createChatRouter } from "./chat"
import { AgentExecutor } from "../../agent/executor"
import { ToolRegistry } from "../../agent/registry"
import { createCache } from "../../cache/lru"
import type { Config } from "../../shared/config"

function mc(): Config {
  return { LLM_API_KEY: "sk", LLM_MODEL: "MiniMax-M2.7", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "k", SOLSCAN_API_KEY: "k", PORT: 3030, FRONTEND_ORIGIN: "http://localhost:5173" }
}

describe("POST /api/chat", () => {
  it("returns 400 when message is missing", async () => {
    const executor = new AgentExecutor(mc(), new ToolRegistry(), createCache())
    const app = express()
    app.use(express.json())
    app.use("/api", createChatRouter(executor))

    const server = app.listen(0)
    const port = (server.address() as any).port
    const res = await fetch(`http://localhost:${port}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    server.close()
  })

  it("returns SSE stream for valid message", async () => {
    const config = mc()
    const executor = new AgentExecutor(config, new ToolRegistry(), createCache())
    jest.spyOn(executor, "run").mockImplementation(async function* () {
      yield { type: "text_delta", data: { content: "Test response" } }
      yield { type: "done" }
    })

    const app = express()
    app.use(express.json())
    app.use("/api", createChatRouter(executor))

    const server = app.listen(0)
    const port = (server.address() as any).port
    const res = await fetch(`http://localhost:${port}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Hello" }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")
    server.close()
  })
})
