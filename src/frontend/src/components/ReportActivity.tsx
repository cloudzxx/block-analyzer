interface Props {
  txCount: number
  timeRange: { start: string; end: string } | null
  chain: string
}

export function ReportActivity({ txCount, timeRange, chain }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Transactions
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
          {txCount.toLocaleString()}
        </div>
        {timeRange && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
            {new Date(timeRange.start).toLocaleDateString()} — {new Date(timeRange.end).toLocaleDateString()}
          </div>
        )}
      </div>
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Network
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
          {chain === "ethereum" ? "Ethereum" : "Solana"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
          Mainnet
        </div>
      </div>
    </div>
  )
}
