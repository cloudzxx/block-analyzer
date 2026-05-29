import { ToolRegistry } from "./registry"
import { buildSystemPrompt } from "./prompt"
import type { Config } from "../../packages/shared/config"
import type { Cache } from "../../storage/cache/lru"

// Agent 事件类型 — 用于 SSE 流式推送
export interface AgentEvent {
  type: "text_delta" | "tool_start" | "tool_result" | "done" | "error"
  data?: {
    content?: string
    name?: string
    args?: Record<string, unknown>
    result?: string
    message?: string
  }
}

// Agent 执行器：管理 LLM 对话循环 + 工具调用
export class AgentExecutor {
  constructor(
    private config: Config,
    private registry: ToolRegistry,
    private cache: Cache,
  ) {}

  // 核心入口：接收用户消息，以 AsyncGenerator 流式返回事件
  async *run(
    userMessage: string,
    history: Array<{ role: string; content: string }> = [],
  ): AsyncGenerator<AgentEvent> {
    // 构建消息列表：系统提示 + 历史 + 当前用户消息
    const systemMessage = { role: "system", content: buildSystemPrompt() }
    const messages: Array<{ role: string; content: string; tool_calls?: unknown[] }> = [
      systemMessage,
      ...history,
      { role: "user", content: userMessage },
    ]

    // 获取 OpenAI 兼容的工具定义列表
    const tools = this.registry.toOpenAIDefinitions()
    let latestToolCalls: Array<{ id: string; function: { name: string; arguments: string } }> | null = null

    try {
      // 第一步：调用 LLM，获取回复或工具调用请求
      const response = await this.callLLM(messages, tools)
      const choice = response.choices?.[0]

      // 如果有文本回复，直接推送
      if (choice?.message?.content) {
        yield { type: "text_delta", data: { content: choice.message.content } }
      }

      // 第二步：如果 LLM 要求调用工具，依次执行
      if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls) {
        const toolCalls = choice.message.tool_calls as Array<{
          id: string
          function: { name: string; arguments: string }
        }>

        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments)
          // 推送工具开始事件（前端可展示 "⏳" 状态）
          yield { type: "tool_start", data: { name: tc.function.name, args, content: tc.function.arguments } }

          // 执行工具调用
          const result = await this.registry.execute(tc.function.name, args, {
            config: this.config,
            cache: this.cache,
          })

          const resultStr = result.success
            ? JSON.stringify(result.data)
            : `Error: ${result.error}`

          // 推送工具结果事件
          yield { type: "tool_result", data: { name: tc.function.name, result: resultStr } }

          // 将工具结果加入消息列表，供 LLM 下一步推理
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: resultStr,
          } as any)
        }

        // 第三步：将工具结果送回 LLM，获取最终回复
        const followUp = await this.callLLM(messages, tools)
        const followUpContent = followUp.choices?.[0]?.message?.content
        if (followUpContent) {
          yield { type: "text_delta", data: { content: followUpContent } }
        }
      }

      yield { type: "done" }
    } catch (err) {
      // 捕获整个流程中的异常
      yield { type: "error", data: { message: (err as Error).message } }
    }
  }

  // 调用 LLM API（非流式，兼容 MiniMax/OpenAI 格式）
  private async callLLM(
    messages: Array<{ role: string; content: string; tool_calls?: unknown[] }>,
    tools: any[],
  ) {
    const body: Record<string, unknown> = {
      model: this.config.LLM_MODEL,
      messages: messages.map((m) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content }
        if (m.tool_calls) msg.tool_calls = m.tool_calls
        if (m.role === "tool") {
          msg.tool_call_id = (m as any).tool_call_id
        }
        return msg
      }),
      stream: false, // MiniMax-M2.7 使用非流式调用
    }

    if (tools.length > 0) {
      body.tools = tools
    }

    const res = await fetch(`${this.config.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`LLM API error ${res.status}: ${text}`)
    }

    return (await res.json()) as {
      choices: Array<{
        finish_reason: string
        message: {
          content: string | null
          tool_calls?: Array<{ id: string; function: { name: string; argument: string } }>
        }
      }>
    }
  }
}

// 将 AgentEvent 格式化为 SSE 协议文本
export function formatSseEvent(event: AgentEvent): string {
  const data = JSON.stringify(event.data || {})
  switch (event.type) {
    case "text_delta": return `event: text_delta\ndata: ${data}\n\n`
    case "tool_start": return `event: tool_start\ndata: ${data}\n\n`
    case "tool_result": return `event: tool_result\ndata: ${data}\n\n`
    case "done": return `event: done\ndata: {}\n\n`
    case "error": return `event: error\ndata: ${data}\n\n`
  }
}
