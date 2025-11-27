interface Counterparty {
  address: string
  txCount: number
  totalValue: string
}

interface Props { counterparties: Counterparty[] }

export function ReportCounterparties({ counterparties }: Props) {
  if (counterparties.length === 0) return null

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ background: "#f5f5f5", padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
        Top Counterparties
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 500, color: "#666" }}>Address</th>
            <th style={{ textAlign: "right", padding: "8px 14px", fontWeight: 500, color: "#666" }}>Interactions</th>
            <th style={{ textAlign: "right", padding: "8px 14px", fontWeight: 500, color: "#666" }}>Total Value</th>
          </tr>
        </thead>
        <tbody>
          {counterparties.map((c, i) => (
            <tr key={i} style={{ borderTop: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 14px", fontFamily: "monospace" }}>
                {c.address.slice(0, 8)}...{c.address.slice(-6)}
              </td>
              <td style={{ textAlign: "right", padding: "8px 14px" }}>{c.txCount}</td>
              <td style={{ textAlign: "right", padding: "8px 14px", fontFamily: "monospace" }}>{c.totalValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
