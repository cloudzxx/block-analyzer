import type { Chain } from "../types"

interface Props {
  value: string
  onChange: (v: string) => void
  onAnalyze: () => void
  isLoading: boolean
  chain: Chain
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "12px 16px",
  borderBottom: "1px solid #e0e0e0",
  background: "white",
}

export function AnalyzeInput({ value, onChange, onAnalyze, isLoading, chain }: Props) {
  return (
    <div style={containerStyle}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
        placeholder={chain === "ethereum" ? "Enter address or ENS name..." : "Enter Solana address..."}
        style={{
          flex: 1,
          padding: "10px 14px",
          border: "1px solid #ccc",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "monospace",
        }}
        disabled={isLoading}
      />
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0 10px",
        fontSize: 12,
        fontWeight: 600,
        color: "#666",
      }}>
        {chain === "ethereum" ? "ETH" : "SOL"}
      </span>
      <button
        onClick={onAnalyze}
        disabled={isLoading || !value.trim()}
        style={{
          padding: "10px 24px",
          background: isLoading ? "#ffcc80" : "#e65100",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: isLoading || !value.trim() ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {isLoading ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  )
}
