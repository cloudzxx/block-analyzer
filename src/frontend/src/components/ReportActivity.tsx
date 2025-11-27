interface Props {
  txCount: number
  timeRange: { start: string; end: string } | null
  chain: string
}

export function ReportActivity({ txCount, timeRange, chain }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>Transactions (recent)</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{txCount.toLocaleString()}</div>
        {timeRange && (
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            {new Date(timeRange.start).toLocaleDateString()} — {new Date(timeRange.end).toLocaleDateString()}
          </div>
        )}
      </div>
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>Network</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          {chain === "ethereum" ? "Ethereum" : "Solana"}
        </div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
          {chain === "ethereum" ? "Mainnet" : "Mainnet"}
        </div>
      </div>
    </div>
  )
}
