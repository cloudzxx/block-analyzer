import { toOpenAIToolDefinition } from "../tools/types"
import type { Tool, ToolContext, ToolResult } from "../tools/types"

export class ToolRegistry {
  private tools = new Map<string, Tool>()

  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  list(): Tool[] {
    return [...this.tools.values()]
  }

  toOpenAIDefinitions() {
    return this.list().map(toOpenAIToolDefinition)
  }

  async execute(name: string, args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` }
    }
    return tool.execute(args, context)
  }
}
