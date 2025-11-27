import { Router, type Request, type Response } from "express"
import type { AgentExecutor } from "../../agent/executor"
import { formatSseEvent } from "../../agent/executor"

export function createChatRouter(executor: AgentExecutor): Router {
  const router = Router()

  router.post("/chat", async (req: Request, res: Response) => {
    const { message } = req.body as { message: string }

    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" })
      return
    }

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    for await (const event of executor.run(message)) {
      res.write(formatSseEvent(event))
    }

    res.end()
  })

  return router
}
