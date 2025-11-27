import { ToolRegistry } from "./registry"
import { buildSystemPrompt } from "./prompt"
import type { Config } from "../shared/config"
import type { Cache } from "../cache/lru"

export interface AgentEvent {
  type: "text_delta" | "tool_start" | "tool_result" | "done" | "error"
  data?: { content?: string; name?: string; args?: Record<string, unknown>; result?: string; message?: string }
}

interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: Array<{
    id: string
    type: "function"
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

interface LLMToolDef {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
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
    history: LLMMessage[] = [],
  ): AsyncGenerator<AgentEvent> {
    const messages: LLMMessage[] = [
      { role: "system", content: buildSystemPrompt() },
      ...history,
      { role: "user", content: userMessage },
    ]

    const tools: LLMToolDef[] = this.registry.toOpenAIDefinitions()

    try {
      for (let loop = 0; loop < 10; loop++) {
        const response = await this.complete(messages, tools)
        const choice = response.choices[0]
        const msg = choice.message

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          messages.push({
            role: "assistant",
            content: msg.content || null,
            tool_calls: msg.tool_calls,
          })

          for (const tc of msg.tool_calls) {
            let args: Record<string, unknown> = {}
            try {
              args = JSON.parse(tc.function.arguments)
            } catch {}

            yield { type: "tool_start", data: { name: tc.function.name, args, content: tc.function.arguments } }

            const result = await this.registry.execute(
              tc.function.name,
              args,
              { config: this.config, cache: this.cache },
            )

            const resultStr = result.success
              ? JSON.stringify(result.data)
              : `Error: ${result.error}`

            yield { type: "tool_result", data: { name: tc.function.name, result: resultStr } }

            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: resultStr,
            })
          }
        } else {
          yield { type: "text_delta", data: { content: msg.content || "" } }
          yield { type: "done" }
          return
        }
      }
    } catch (err) {
      yield { type: "error", data: { message: (err as Error).message } }
    }
  }

  private async complete(messages: LLMMessage[], tools: LLMToolDef[]) {
    const body: Record<string, unknown> = {
      model: this.config.LLM_MODEL,
      messages,
      stream: false,
    }
    if (tools.length > 0) body.tools = tools

    const res = await fetch(`${this.config.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM API error (${res.status}): ${err}`)
    }

    return res.json() as Promise<{
      choices: Array<{
        finish_reason: string
        message: {
          role: string
          content: string | null
          tool_calls?: Array<{
            id: string
            type: "function"
            function: { name: string; arguments: string }
          }>
        }
      }>
    }>
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
