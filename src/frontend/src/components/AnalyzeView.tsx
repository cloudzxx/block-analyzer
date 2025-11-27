import { useState } from "react"
import { useAnalysis } from "../hooks/useAnalysis"
import { AnalyzeInput } from "./AnalyzeInput"
import { AnalyzeProgress } from "./AnalyzeProgress"
import { AnalysisReport } from "./AnalysisReport"
import type { Chain } from "../types"

interface Props { chain: Chain }

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}

export function AnalyzeView({ chain }: Props) {
  const { report, progress, isRunning, error, runAnalysis, reset } = useAnalysis()
  const [inputAddr, setInputAddr] = useState("")

  const handleAnalyze = () => {
    if (!inputAddr.trim() || isRunning) return
    runAnalysis(inputAddr.trim(), chain)
  }

  return (
    <div style={containerStyle}>
      <AnalyzeInput
        value={inputAddr}
        onChange={setInputAddr}
        onAnalyze={handleAnalyze}
        isLoading={isRunning}
        chain={chain}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!report && !isRunning && !error && (
          <div style={{ textAlign: "center", color: "#999", marginTop: 80, fontSize: 14 }}>
            Enter an address and click Analyze to start
          </div>
        )}
        {error && (
          <div style={{ color: "#e53935", background: "#ffebee", padding: 12, borderRadius: 8, marginBottom: 16 }}>
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
                  background: "#e65100",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
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
