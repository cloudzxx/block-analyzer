import { useState, useCallback } from "react"
import type { ChatMessage, ToolCallInfo } from "../../types"

// Chat SSE Hook：管理消息列表、流式接收 Agent 事件
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (userMsg: string) => {
    if (!userMsg.trim()) return

    // 追加用户消息
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setIsLoading(true)

    // 创建空白助手消息，后续流式填入内容
    const assistantMsg: ChatMessage = { role: "assistant", content: "", toolCalls: [] }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      })

      // 读取 SSE 流
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // 解析 SSE 事件块（按 \n\n 分隔）
        while (true) {
          const eventEnd = buffer.indexOf("\n\n")
          if (eventEnd === -1) break

          const eventBlock = buffer.slice(0, eventEnd)
          buffer = buffer.slice(eventEnd + 2)

          // 提取 event type 和 data
          const eventMatch = eventBlock.match(/^event:\s*(\w+)/m)
          const eventType = eventMatch ? eventMatch[1] : ""
          const dataMatch = eventBlock.match(/^data:\s*(.+)$/m)
          const dataStr = dataMatch ? dataMatch[1] : "{}"

          let data: Record<string, unknown> = {}
          try { data = JSON.parse(dataStr) } catch {}

          switch (eventType) {
            case "text_delta":
              // 增量文本：追加到最后一条助手消息
              setMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                copy[copy.length - 1] = { ...last, content: last.content + (data.content as string || "") }
                return copy
              })
              break

            case "tool_start":
              // 工具调用开始，添加一个 running 状态的工具卡片
              const toolCall: ToolCallInfo = {
                name: data.name as string || "",
                args: data.content as string || "",
                result: "",
                status: "running",
              }
              setMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                copy[copy.length - 1] = {
                  ...last,
                  toolCalls: [...(last.toolCalls || []), toolCall],
                }
                return copy
              })
              break

            case "tool_result":
              // 工具结果返回，更新对应工具卡片状态为 done
              setMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                const calls = [...(last.toolCalls || [])]
                const idx = calls.findIndex((t) => t.name === data.name)
                if (idx !== -1) {
                  calls[idx] = { ...calls[idx], result: data.result as string || "", status: "done" }
                }
                copy[copy.length - 1] = { ...last, toolCalls: calls }
                return copy
              })
              break

            case "done": break
            case "error":
              setMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                const calls = [...(last.toolCalls || [])]
                if (calls.length > 0) {
                  calls[calls.length - 1] = { ...calls[calls.length - 1], status: "error" }
                }
                copy[copy.length - 1] = { ...last, toolCalls: calls }
                return copy
              })
              break
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, sendMessage, isLoading, clearMessages }
}
