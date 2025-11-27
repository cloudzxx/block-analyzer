import { useState, useCallback } from "react"
import type { AnalysisReport, AnalysisProgress } from "../types"

interface UseAnalysisReturn {
  report: AnalysisReport | null
  progress: AnalysisProgress[]
  isRunning: boolean
  error: string | null
  runAnalysis: (address: string, chain: string) => void
  reset: () => void
}

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

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

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
            case "step_start": {
              const step = data.step as string
              setProgress((prev) =>
                prev.map((p) => ({
                  ...p,
                  status: p.step === step ? "running" : p.status,
                }))
              )
              break
            }
            case "step_result": {
              const step = data.step as string
              setProgress((prev) =>
                prev.map((p) => ({
                  ...p,
                  status: p.step === step ? "done" : p.status,
                }))
              )
              break
            }
            case "report": {
              const reportData = data.report as AnalysisReport
              setReport(reportData)
              break
            }
            case "error": {
              setError((data.message as string) || "Analysis failed")
              break
            }
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
