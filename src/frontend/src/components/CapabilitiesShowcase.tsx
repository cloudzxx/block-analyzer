import type { ToolInfo } from "../types"

interface Props { tools: ToolInfo[] }

const chainLabels = { ethereum: "Ethereum", solana: "Solana", common: "Cross-Chain" }

const groupStyle: React.CSSProperties = { marginBottom: 16 }

const cardStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "white",
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  marginBottom: 6,
}

export function CapabilitiesShowcase({ tools }: Props) {
  const groups = {
    ethereum: tools.filter(t => t.chain === "ethereum"),
    solana: tools.filter(t => t.chain === "solana"),
    common: tools.filter(t => t.chain === "common"),
  }

  return (
    <div>
      <h4 style={{ margin: "0 0 8px" }}>Tools by Chain</h4>
      {(Object.entries(groups) as [keyof typeof groups, ToolInfo[]][]).map(([key, items]) => (
        <div key={key} style={groupStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>
            {chainLabels[key]}
          </div>
          {items.map((t) => (
            <div key={t.name} style={cardStyle}>
              <div style={{ fontSize: 12, fontWeight: 500, fontFamily: "monospace" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "#666" }}>{t.description}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
