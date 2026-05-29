interface Counterparty {
  address: string
  txCount: number
  totalValue: string
}

interface Props { counterparties: Counterparty[] }

export function ReportCounterparties({ counterparties }: Props) {
  if (counterparties.length === 0) return null

  return (
    <div style={{
      background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: 12,
      marginBottom: 16,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-primary)",
        borderBottom: "1px solid var(--glass-border)",
      }}>
        Top Counterparties
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 500, color: "var(--text-tertiary)", fontSize: 11 }}>Address</th>
            <th style={{ textAlign: "right", padding: "8px 16px", fontWeight: 500, color: "var(--text-tertiary)", fontSize: 11 }}>Interactions</th>
            <th style={{ textAlign: "right", padding: "8px 16px", fontWeight: 500, color: "var(--text-tertiary)", fontSize: 11 }}>Total Value</th>
          </tr>
        </thead>
        <tbody>
          {counterparties.map((c, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--glass-border)" }}>
              <td style={{
                padding: "10px 16px",
                fontFamily: "var(--font-mono)",
                color: "var(--accent-start)",
                fontSize: 11,
              }}>
                {c.address.slice(0, 8)}...{c.address.slice(-6)}
              </td>
              <td style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-primary)" }}>{c.txCount}</td>
              <td style={{ textAlign: "right", padding: "10px 16px", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{c.totalValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
