import { Router, type Request, type Response } from "express"
import type { AgentExecutor } from "../agent/executor"
import { formatSseEvent } from "../agent/executor"

// Chat SSE 路由：接收用户消息 → 调用 Agent → 流式返回事件
export function createChatRouter(executor: AgentExecutor): Router {
  const router = Router()

  router.post("/chat", async (req: Request, res: Response) => {
    const { message } = req.body as { message: string }

    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" })
      return
    }

    // 设置 Server-Sent Events 响应头
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    // 遍历 Agent 生成的事件，逐条推送给前端
    for await (const event of executor.run(message)) {
      res.write(formatSseEvent(event))
    }

    res.end()
  })

  return router
}
