import type { Cache } from "../../storage/cache/lru"
import type { Config } from "../../packages/shared/config"

// 工具上下文：执行工具时注入的依赖
export interface ToolContext {
  config: Config
  cache: Cache
}

// 工具执行结果（统一格式）
export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// 工具定义接口
export interface Tool {
  name: string           // 唯一标识，如 "eth_getBalance"
  description: string    // 描述，LLM 据此决定何时调用
  parameters: Record<string, unknown>  // JSON Schema 参数定义
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
  cacheTTL?: number      // 缓存时间（毫秒），未设置则不缓存
}

// 转换为 OpenAI 函数调用格式
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
