import { describe, it, expect, afterEach } from "bun:test"
import { AgentExecutor } from "./executor"
import { ToolRegistry } from "./registry"
import type { Config } from "@shared/config"
import type { Tool, ToolResult } from "../queries/types"
import { createCache } from "@storage/cache/lru"

function mockConfig(): Config {
  return { LLM_API_KEY: "sk-test", LLM_MODEL: "MiniMax-M2.7", LLM_BASE_URL: "https://api.minimaxi.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3030, FRONTEND_ORIGIN: "http://localhost:5173" }
}

const origFetch = globalThis.fetch

describe("AgentExecutor", () => {
  afterEach(() => {
    globalThis.fetch = origFetch
  })

  it("emits text_delta for text response", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({
        choices: [{ finish_reason: "stop", message: { content: "Hello world", role: "assistant" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } })

    const executor = new AgentExecutor(mockConfig(), new ToolRegistry(), createCache())
    const chunks: string[] = []
    for await (const event of executor.run("Hello")) {
      if (event.type === "text_delta") chunks.push(event.data!.content!)
    }
    expect(chunks.join("")).toBe("Hello world")
  })

  it("handles tool calls and emits tool events", async () => {
    const registry = new ToolRegistry()
    const cache = createCache()
    const testTool: Tool = {
      name: "test",
      description: "t",
      parameters: { type: "object", properties: { x: { type: "string" } }, required: ["x"] },
      execute: async (args): Promise<ToolResult> => ({ success: true, data: `result:${args.x}` }),
    }
    registry.register(testTool)

    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      if (callCount === 1) {
        return new Response(JSON.stringify({
          choices: [{
            finish_reason: "tool_calls",
            message: {
              content: null,
              role: "assistant",
              tool_calls: [{ id: "call_1", function: { name: "test", arguments: '{"x":"hi"}' } }],
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      return new Response(JSON.stringify({
        choices: [{ finish_reason: "stop", message: { content: "Done", role: "assistant" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    const executor = new AgentExecutor(mockConfig(), registry, cache)
    const events: string[] = []
    for await (const event of executor.run("test")) events.push(event.type)
    expect(events).toContain("tool_start")
    expect(events).toContain("tool_result")
    expect(events).toContain("done")
  })

  it("emits error event on API failure", async () => {
    globalThis.fetch = async () => new Response("Bad Request", { status: 400 })

    const executor = new AgentExecutor(mockConfig(), new ToolRegistry(), createCache())
    const events: string[] = []
    for await (const event of executor.run("Hello")) events.push(event.type)
    expect(events).toContain("error")
  })
})
