interface Props { insights: string }

export function ReportInsights({ insights }: Props) {
  if (!insights) return null

  return (
    <div style={{
      background: "#f5f5f5",
      border: "1px solid #e0e0e0",
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>AI Insights</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "#444", whiteSpace: "pre-wrap" }}>
        {insights}
      </div>
    </div>
  )
}
