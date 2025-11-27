interface Props { insights: string }

export function ReportInsights({ insights }: Props) {
  if (!insights) return null

  return (
    <div style={{
      background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-primary)",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "white",
        }}>AI</span>
        AI Insights
      </div>
      <div style={{
        fontSize: 13,
        lineHeight: 1.7,
        color: "var(--text-secondary)",
        whiteSpace: "pre-wrap",
      }}>
        {insights}
      </div>
    </div>
  )
}
