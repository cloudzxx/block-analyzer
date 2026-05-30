import { useState } from "react"
import { useAnalysis } from "../hooks/useAnalysis"
import { AnalyzeInput } from "./AnalyzeInput"
import { AnalyzeProgress } from "./AnalyzeProgress"
import { AnalysisReport } from "./AnalysisReport"
import type { Chain } from "@/types"

interface Props { chain: Chain }

export function AnalyzeView({ chain }: Props) {
  const { report, progress, isRunning, error, runAnalysis, reset } = useAnalysis()
  const [inputAddr, setInputAddr] = useState("")

  const handleAnalyze = () => {
    if (!inputAddr.trim() || isRunning) return
    runAnalysis(inputAddr.trim(), chain)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AnalyzeInput
        value={inputAddr}
        onChange={setInputAddr}
        onAnalyze={handleAnalyze}
        isLoading={isRunning}
        chain={chain}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!report && !isRunning && !error && (
          <div style={{ textAlign: "center", color: "var(--text-tertiary)", marginTop: 80, fontSize: 14 }}>
            Enter an address and click Analyze to start
          </div>
        )}
        {error && (
          <div style={{
            color: "var(--red)",
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.2)",
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
          }}>
            Error: {error}
          </div>
        )}
        {(isRunning || progress.length > 0) && !report && (
          <AnalyzeProgress steps={progress} />
        )}
        {report && (
          <>
            <AnalysisReport report={report} />
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                onClick={reset}
                style={{
                  padding: "8px 20px",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 999,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 13,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-bg-hover)"; e.currentTarget.style.color = "var(--text-primary)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--glass-bg)"; e.currentTarget.style.color = "var(--text-secondary)" }}
              >
                New Analysis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
