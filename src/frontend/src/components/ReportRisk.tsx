interface RiskFlag {
  label: string
  severity: "info" | "warning" | "critical"
}

interface Props {
  score: "low" | "medium" | "high"
  flags: RiskFlag[]
}

const scoreStyles: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "rgba(52, 211, 153, 0.15)", text: "#34d399", label: "Low Risk" },
  medium: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24", label: "Medium Risk" },
  high: { bg: "rgba(248, 113, 113, 0.15)", text: "#f87171", label: "High Risk" },
}

const severityStyles: Record<string, { bg: string; text: string }> = {
  info: { bg: "rgba(99, 102, 241, 0.12)", text: "#6366f1" },
  warning: { bg: "rgba(251, 191, 36, 0.12)", text: "#fbbf24" },
  critical: { bg: "rgba(248, 113, 113, 0.12)", text: "#f87171" },
}

export function ReportRisk({ score, flags }: Props) {
  return (
    <div style={{
      background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
        Risk Assessment
      </div>

      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: scoreStyles[score].bg,
        color: scoreStyles[score].text,
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 10,
      }}>
        {score === "low" ? "🟢" : score === "medium" ? "🟡" : "🔴"}
        {scoreStyles[score].label}
      </div>

      {flags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {flags.map((f, i) => (
            <span key={i} style={{
              background: severityStyles[f.severity].bg,
              color: severityStyles[f.severity].text,
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              border: `1px solid ${severityStyles[f.severity].bg}`,
            }}>
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
