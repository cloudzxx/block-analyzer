import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { ToolRegistry } from "./registry"
import { buildSystemPrompt } from "./prompt"
import type { Config } from "../shared/config"
import type { Cache } from "../cache/lru"

export interface AgentEvent {
  type: "text_delta" | "tool_start" | "tool_result" | "done" | "error"
  data?: { content?: string; name?: string; args?: Record<string, unknown>; result?: string; message?: string }
}

export class AgentExecutor {
  private openai: OpenAI

  constructor(
    private config: Config,
    private registry: ToolRegistry,
    private cache: Cache,
  ) {
    this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
  }

  async *run(
    userMessage: string,
    history: ChatCompletionMessageParam[] = [],
  ): AsyncGenerator<AgentEvent> {
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: buildSystemPrompt(),
    }

    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...history,
      { role: "user", content: userMessage },
    ]

    const tools = this.registry.toOpenAIDefinitions()

    type AccumulatedToolCall = { id: string; function: { name: string; arguments: string } }

    let latestToolCalls: AccumulatedToolCall[] | null = null

    try {
      let stream = await this.createStream(messages, tools)

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          yield { type: "text_delta", data: { content: delta.content } }
        }

        if (delta?.tool_calls) {
          latestToolCalls = this.accumulateToolCalls(delta.tool_calls, messages)
        }

        if (chunk.choices[0]?.finish_reason === "tool_calls" && latestToolCalls) {
          for (const tc of latestToolCalls) {
            const args = JSON.parse(tc.function.arguments)
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
            } as ChatCompletionMessageParam)
          }

          latestToolCalls = null

          const followUpStream = await this.createStream(messages, tools)
          for await (const chunk of followUpStream) {
            if (chunk.choices[0]?.delta?.content) {
              yield { type: "text_delta", data: { content: chunk.choices[0].delta.content } }
            }
          }
          yield { type: "done" }
        }

        if (chunk.choices[0]?.finish_reason === "stop") {
          yield { type: "done" }
        }
      }
    } catch (err) {
      yield { type: "error", data: { message: (err as Error).message } }
    }
  }

  private async createStream(
    messages: ChatCompletionMessageParam[],
    tools: any[],
  ) {
    return this.openai.chat.completions.create({
      model: this.config.OPENAI_MODEL,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
    })
  }

  private accumulateToolCalls(
    rawToolCalls: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[],
    messages: ChatCompletionMessageParam[],
  ) {
    const accumulated: Record<number, { id: string; function: { name: string; arguments: string } }> = {}

    for (const tc of rawToolCalls) {
      if (!accumulated[tc.index]) {
        accumulated[tc.index] = {
          id: tc.id || "",
          function: { name: tc.function?.name || "", arguments: tc.function?.arguments || "" },
        }
      } else {
        if (tc.function?.arguments) {
          accumulated[tc.index].function.arguments += tc.function.arguments
        }
      }
    }

    const result = Object.values(accumulated)
    messages.push({
      role: "assistant",
      tool_calls: result.map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: tc.function,
      })),
      content: null,
    } as any)

    return result
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
