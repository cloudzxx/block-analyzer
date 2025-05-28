import type { Cache } from "../cache/lru"
import type { Config } from "../shared/config"

export interface ToolContext {
  config: Config
  cache: Cache
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
  cacheTTL?: number
}

export function toOpenAIToolDefinition(tool: Tool) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }
}
