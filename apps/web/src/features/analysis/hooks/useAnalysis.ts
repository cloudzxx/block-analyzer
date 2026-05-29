import { useState, useCallback } from "react"
import type { AnalysisReport, AnalysisProgress } from "../../types"

// 分析 SSE Hook：管理分析进度条 + 报告状态
interface UseAnalysisReturn {
  report: AnalysisReport | null
  progress: AnalysisProgress[]
  isRunning: boolean
  error: string | null
  runAnalysis: (address: string, chain: string) => void
  reset: () => void
}

// 分析流程的固定 4 个步骤
const STEPS = ["resolve", "balance", "transactions", "insights"]
const STEP_LABELS: Record<string, string> = {
  resolve: "Resolving address",
  balance: "Fetching balance",
  transactions: "Analyzing transactions",
  insights: "AI generating insights",
}

export function useAnalysis(): UseAnalysisReturn {
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初始化进度条：所有步骤设为 pending
  const initProgress = useCallback(() => {
    return STEPS.map((step) => ({
      step,
      label: STEP_LABELS[step] || step,
      status: "pending" as const,
    }))
  }, [])

  const runAnalysis = useCallback(async (address: string, chain: string) => {
    setReport(null)
    setError(null)
    setProgress(initProgress())
    setIsRunning(true)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain }),
      })

      // 读取 SSE 流，更新进度条和报告
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // 解析 SSE 事件
        while (true) {
          const eventEnd = buffer.indexOf("\n\n")
          if (eventEnd === -1) break

          const eventBlock = buffer.slice(0, eventEnd)
          buffer = buffer.slice(eventEnd + 2)

          const eventMatch = eventBlock.match(/^event:\s*(\w+)/m)
          const eventType = eventMatch ? eventMatch[1] : ""
          const dataMatch = eventBlock.match(/^data:\s*(.+)$/m)
          const dataStr = dataMatch ? dataMatch[1] : "{}"

          let data: Record<string, unknown> = {}
          try { data = JSON.parse(dataStr) } catch {}

          switch (eventType) {
            case "step_start":
              // 步骤开始：将该步骤标记为 running
              const step = data.step as string
              setProgress((prev) =>
                prev.map((p) => ({
                  ...p,
                  status: p.step === step ? "running" : p.status,
                }))
              )
              break
            case "step_result":
              // 步骤完成：标记为 done
              const doneStep = data.step as string
              setProgress((prev) =>
                prev.map((p) => ({
                  ...p,
                  status: p.step === doneStep ? "done" : p.status,
                }))
              )
              break
            case "report":
              // 分析报告就绪
              const reportData = data.report as AnalysisReport
              setReport(reportData)
              break
            case "error":
              setError((data.message as string) || "Analysis failed")
              break
          }
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsRunning(false)
    }
  }, [initProgress])

  const reset = useCallback(() => {
    setReport(null)
    setProgress([])
    setError(null)
    setIsRunning(false)
  }, [])

  return { report, progress, isRunning, error, runAnalysis, reset }
}
