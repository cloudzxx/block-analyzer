import type { AnalysisProgress } from "../types"

interface Props { steps: AnalysisProgress[] }

export function AnalyzeProgress({ steps }: Props) {
  return (
    <div style={{
      maxWidth: 500,
      margin: "40px auto",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {steps.map((s) => (
        <div key={s.step} style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: s.status === "pending" ? 0.4 : 1,
          transition: "opacity 0.3s",
        }}>
          <span style={{ fontSize: 20 }}>
            {s.status === "done" ? "[x]" : s.status === "running" ? "[~]" : "[ ]"}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "#999" }}>
              {s.status === "pending" ? "Waiting..." : s.status === "running" ? "In progress..." : "Complete"}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
