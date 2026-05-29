import type { AnalysisProgress } from "../../../types"

interface Props { steps: AnalysisProgress[] }

export function AnalyzeProgress({ steps }: Props) {
  return (
    <div style={{
      maxWidth: 500,
      margin: "40px auto",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {steps.map((s) => (
        <div key={s.step} style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: s.status === "pending" ? 0.4 : 1,
          transition: "opacity 0.3s",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: 10,
          padding: "12px 16px",
        }}>
          <span style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            background: s.status === "done"
              ? "linear-gradient(135deg, var(--accent-start), var(--accent-end))"
              : s.status === "running"
              ? "rgba(99, 102, 241, 0.2)"
              : "transparent",
            border: s.status === "pending" ? "1px solid var(--glass-border)" : "none",
            color: s.status === "done" ? "white" : "var(--text-secondary)",
          }}>
            {s.status === "done" ? "✓" : s.status === "running" ? "→" : ""}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {s.status === "pending" ? "Waiting..." : s.status === "running" ? "In progress..." : "Complete"}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
