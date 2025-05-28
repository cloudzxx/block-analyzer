import { describe, it, expect, jest } from "bun:test"
import { AgentExecutor } from "./executor"
import { ToolRegistry } from "./registry"
import type { Config } from "../shared/config"
import type { Tool, ToolResult } from "../tools/types"
import { createCache } from "../cache/lru"

function mockConfig(): Config {
  return { OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-4o", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3000, FRONTEND_ORIGIN: "http://localhost:5173" }
}

describe("AgentExecutor", () => {
  it("streams text deltas from OpenAI", async () => {
    const config = mockConfig()
    const registry = new ToolRegistry()
    const cache = createCache()
    const executor = new AgentExecutor(config, registry, cache)

    const mockStream = (async function* () {
      yield { choices: [{ delta: { content: "Hello" }, index: 0, finish_reason: null as string | null }] }
      yield { choices: [{ delta: { content: " world" }, index: 0, finish_reason: null as string | null }] }
      yield { choices: [{ delta: {}, index: 0, finish_reason: "stop" }] }
    })()

    jest.spyOn(executor as any, "createStream").mockResolvedValue(mockStream)

    const chunks: string[] = []
    for await (const event of executor.run("Hello")) {
      if (event.type === "text_delta") chunks.push(event.data!.content!)
    }
    expect(chunks.join("")).toBe("Hello world")
  })

  it("handles tool calls and emits tool events", async () => {
    const config = mockConfig()
    const registry = new ToolRegistry()
    const cache = createCache()

    const testTool: Tool = {
      name: "test",
      description: "t",
      parameters: { type: "object", properties: { x: { type: "string" } }, required: ["x"] },
      execute: async (args): Promise<ToolResult> => ({ success: true, data: `result:${args.x}` }),
    }
    registry.register(testTool)

    const executor = new AgentExecutor(config, registry, cache)

    const mockStream1 = (async function* () {
      yield { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "test", arguments: '{"x":"hi"}' } }] }, index: 0, finish_reason: null as string | null }] }
      yield { choices: [{ delta: {}, index: 0, finish_reason: "tool_calls" }] }
    })()

    const mockStream2 = (async function* () {
      yield { choices: [{ delta: { content: "Done" }, index: 0, finish_reason: null as string | null }] }
      yield { choices: [{ delta: {}, index: 0, finish_reason: "stop" }] }
    })()

    let callCount = 0
    jest.spyOn(executor as any, "createStream").mockImplementation(() => {
      callCount++
      return callCount === 1 ? mockStream1 : mockStream2
    })

    const events: string[] = []
    for await (const event of executor.run("test")) events.push(event.type)
    expect(events).toContain("tool_start")
    expect(events).toContain("tool_result")
    expect(events).toContain("done")
  })
})
