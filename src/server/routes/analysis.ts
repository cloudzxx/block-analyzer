import { Router, type Request, type Response } from "express"
import { AnalysisExecutor } from "../../analysis/executor"

export function createAnalysisRouter(executor: AnalysisExecutor): Router {
  const router = Router()

  router.post("/analyze", async (req: Request, res: Response) => {
    const { address, chain } = req.body as { address?: string; chain?: string }

    if (!address?.trim()) {
      res.status(400).json({ error: "Address is required" })
      return
    }

    const validChain = chain === "solana" ? "solana" : "ethereum"

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    try {
      for await (const event of executor.analyze(address.trim(), validChain)) {
        if ("type" in event && event.type === "report") {
          const data = JSON.stringify({ report: event.report })
          res.write(`event: report\ndata: ${data}\n\n`)
        } else {
          const { step, label } = event as { step: string; label: string }
          res.write(`event: step_start\ndata: ${JSON.stringify({ step, label })}\n\n`)
        }
      }
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`)
    }

    res.write("event: done\ndata: {}\n\n")
    res.end()
  })

  return router
}
