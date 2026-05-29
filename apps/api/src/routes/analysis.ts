import { Router, type Request, type Response } from "express"
import { AnalysisExecutor } from "../analysis/executor"

// 分析 SSE 路由：接收地址 → 执行 4 步分析 → 流式返回步骤和报告
export function createAnalysisRouter(executor: AnalysisExecutor): Router {
  const router = Router()

  router.post("/analyze", async (req: Request, res: Response) => {
    const { address, chain } = req.body as { address?: string; chain?: string }

    if (!address?.trim()) {
      res.status(400).json({ error: "Address is required" })
      return
    }

    // 校验链类型，默认为 ethereum
    const validChain = chain === "solana" ? "solana" : "ethereum"

    // 设置 SSE 响应头
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    try {
      // 遍历分析执行器的生成器，处理两种事件类型
      for await (const event of executor.analyze(address.trim(), validChain)) {
        if ("type" in event && event.type === "report") {
          // 报告事件：推送完整分析报告
          const data = JSON.stringify({ report: event.report })
          res.write(`event: report\ndata: ${data}\n\n`)
        } else {
          // 步骤事件：推送当前步骤名称和标签
          const { step, label } = event as { step: string; label: string }
          res.write(`event: step_start\ndata: ${JSON.stringify({ step, label })}\n\n`)
        }
      }
    } catch (err) {
      // 整个分析流程的异常捕获
      res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`)
    }

    res.write("event: done\ndata: {}\n\n")
    res.end()
  })

  return router
}
