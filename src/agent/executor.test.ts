import { describe, it, expect, jest } from "bun:test"
import { AgentExecutor } from "./executor"
import { ToolRegistry } from "./registry"
import type { Config } from "../shared/config"
import type { Tool, ToolResult } from "../tools/types"
import { createCache } from "../cache/lru"

function mockConfig(): Config {
  return { LLM_API_KEY: "sk-test", LLM_MODEL: "gpt-4o", LLM_BASE_URL: "https://api.openai.com/v1", ETHERSCAN_API_KEY: "e", SOLSCAN_API_KEY: "s", PORT: 3000, FRONTEND_ORIGIN: "http://localhost:5173" }
}

describe("AgentExecutor", () => {
  it("emits text_delta and done for text-only response", async () => {
    const executor = new AgentExecutor(mockConfig(), new ToolRegistry(), createCache())

    jest.spyOn(executor as any, "complete").mockResolvedValue({
      choices: [{
        finish_reason: "stop",
        message: { role: "assistant", content: "Hello world" },
      }],
    })

    const events: Array<{ type: string; data?: any }> = []
    for await (const event of executor.run("hi")) events.push(event)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe("text_delta")
    expect(events[0].data?.content).toBe("Hello world")
    expect(events[1].type).toBe("done")
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

    const mockComplete = jest.spyOn(executor as any, "complete")
    mockComplete
      .mockResolvedValueOnce({
        choices: [{
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_1",
              type: "function" as const,
              function: { name: "test", arguments: '{"x":"hi"}' },
            }],
          },
        }],
      })
      .mockResolvedValueOnce({
        choices: [{
          finish_reason: "stop",
          message: { role: "assistant", content: "Done" },
        }],
      })

    const events: string[] = []
    for await (const event of executor.run("test")) events.push(event.type)
    expect(events).toContain("tool_start")
    expect(events).toContain("tool_result")
    expect(events).toContain("done")
  })
})
