interface RiskFlag {
  label: string
  severity: "info" | "warning" | "critical"
}

interface Props {
  score: "low" | "medium" | "high"
  flags: RiskFlag[]
}

const scoreColors: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "#e8f5e9", text: "#2e7d32", label: "Low Risk" },
  medium: { bg: "#fff3e0", text: "#e65100", label: "Medium Risk" },
  high: { bg: "#ffebee", text: "#c62828", label: "High Risk" },
}

const severityColors: Record<string, { bg: string; text: string }> = {
  info: { bg: "#e3f2fd", text: "#1565c0" },
  warning: { bg: "#fff3e0", text: "#e65100" },
  critical: { bg: "#ffebee", text: "#c62828" },
}

export function ReportRisk({ score, flags }: Props) {
  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Risk Assessment</div>

      <div style={{
        display: "inline-block",
        background: scoreColors[score].bg,
        color: scoreColors[score].text,
        padding: "6px 14px",
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 10,
      }}>
        {scoreColors[score].label}
      </div>

      {flags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {flags.map((f, i) => (
            <span key={i} style={{
              background: severityColors[f.severity].bg,
              color: severityColors[f.severity].text,
              padding: "4px 10px",
              borderRadius: 12,
              fontSize: 11,
            }}>
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
