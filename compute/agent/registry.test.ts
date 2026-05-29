import { describe, it, expect, beforeEach, jest } from "bun:test"
import { ToolRegistry } from "./registry"
import type { Tool, ToolContext, ToolResult } from "../queries/types"

function makeMockTool(name: string): Tool {
  return {
    name,
    description: `Mock tool ${name}`,
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (): Promise<ToolResult> => ({ success: true, data: name }),
  }
}

describe("ToolRegistry", () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = new ToolRegistry()
  })

  it("registers and retrieves a tool", () => {
    const tool = makeMockTool("test_tool")
    registry.register(tool)
    expect(registry.get("test_tool")).toBe(tool)
  })

  it("returns undefined for unregistered tool", () => {
    expect(registry.get("nonexistent")).toBeUndefined()
  })

  it("lists all tools", () => {
    registry.register(makeMockTool("a"))
    registry.register(makeMockTool("b"))
    expect(registry.list()).toHaveLength(2)
  })

  it("toOpenAIDefinitions returns OpenAI-format definitions", () => {
    registry.register(makeMockTool("foo"))
    const defs = registry.toOpenAIDefinitions()
    expect(defs).toHaveLength(1)
    expect(defs[0].type).toBe("function")
    expect(defs[0].function.name).toBe("foo")
  })

  it("executes a tool with context", async () => {
    const tool = makeMockTool("exec_test")
    const execSpy = jest.spyOn(tool, "execute")
    registry.register(tool)

    const context = { config: {} as any, cache: {} as any }
    const result = await registry.execute("exec_test", {}, context)
    expect(result.success).toBe(true)
    expect(execSpy).toHaveBeenCalledWith({}, context)
  })
})
