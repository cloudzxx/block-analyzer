import { toOpenAIToolDefinition } from "../tools/types"
import type { Tool, ToolContext, ToolResult } from "../tools/types"

// 工具注册中心：管理所有区块链数据工具的注册、查找和调用
export class ToolRegistry {
  private tools = new Map<string, Tool>()

  // 注册一个工具（按名称索引）
  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  // 按名称查找工具
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  // 列出所有已注册工具
  list(): Tool[] {
    return [...this.tools.values()]
  }

  // 转换为 OpenAI 函数调用格式的数组
  toOpenAIDefinitions() {
    return this.list().map(toOpenAIToolDefinition)
  }

  // 按名称执行工具，返回统一格式的结果
  async execute(name: string, args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` }
    }
    return tool.execute(args, context)
  }
}
