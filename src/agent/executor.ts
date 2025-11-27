import { ToolRegistry } from "./registry"
import { buildSystemPrompt } from "./prompt"
import type { Config } from "../shared/config"
import type { Cache } from "../cache/lru"

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

export class AgentExecutor {
  constructor(
    private config: Config,
    private registry: ToolRegistry,
    private cache: Cache,
  ) {}

  async *run(
    userMessage: string,
    history: Array<{ role: string; content: string }> = [],
  ): AsyncGenerator<AgentEvent> {
    const systemMessage = { role: "system", content: buildSystemPrompt() }
    const messages: Array<{ role: string; content: string; tool_calls?: unknown[] }> = [
      systemMessage,
      ...history,
      { role: "user", content: userMessage },
    ]

    const tools = this.registry.toOpenAIDefinitions()

    let latestToolCalls: Array<{ id: string; function: { name: string; arguments: string } }> | null = null

    try {
      const response = await this.callLLM(messages, tools)
      const choice = response.choices?.[0]

      if (choice?.message?.content) {
        yield { type: "text_delta", data: { content: choice.message.content } }
      }

      if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls) {
        const toolCalls = choice.message.tool_calls as Array<{
          id: string
          function: { name: string; arguments: string }
        }>

        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments)
          yield { type: "tool_start", data: { name: tc.function.name, args, content: tc.function.arguments } }

          const result = await this.registry.execute(tc.function.name, args, {
            config: this.config,
            cache: this.cache,
          })

          const resultStr = result.success
            ? JSON.stringify(result.data)
            : `Error: ${result.error}`

          yield { type: "tool_result", data: { name: tc.function.name, result: resultStr } }

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: resultStr,
          } as any)
        }

        const followUp = await this.callLLM(messages, tools)
        const followUpContent = followUp.choices?.[0]?.message?.content
        if (followUpContent) {
          yield { type: "text_delta", data: { content: followUpContent } }
        }
      }

      yield { type: "done" }
    } catch (err) {
      yield { type: "error", data: { message: (err as Error).message } }
    }
  }

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
      stream: false,
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
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
        }
      }>
    }
  }
}

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
