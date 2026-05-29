import type { Chain } from "../../../types"

interface Props {
  value: string
  onChange: (v: string) => void
  onAnalyze: () => void
  isLoading: boolean
  chain: Chain
}

export function AnalyzeInput({ value, onChange, onAnalyze, isLoading, chain }: Props) {
  return (
    <div style={{
      display: "flex",
      gap: 8,
      padding: "12px 16px",
      borderBottom: "1px solid var(--glass-border)",
      background: "var(--bg-secondary)",
    }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
        placeholder={chain === "ethereum" ? "Enter address or ENS name..." : "Enter Solana address..."}
        style={{
          flex: 1,
          padding: "10px 14px",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: 999,
          fontSize: 14,
          fontFamily: "var(--font-mono)",
          color: "var(--text-primary)",
          outline: "none",
        }}
        disabled={isLoading}
      />
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0 10px",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-secondary)",
      }}>
        {chain === "ethereum" ? "Ethereum" : "Solana"}
      </span>
      <button
        onClick={onAnalyze}
        disabled={isLoading || !value.trim()}
        style={{
          padding: "10px 24px",
          background: !value.trim() || isLoading
            ? "rgba(99, 102, 241, 0.3)"
            : "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
          color: "white",
          border: "none",
          borderRadius: 999,
          cursor: !value.trim() || isLoading ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 600,
          transition: "opacity 0.15s",
        }}
      >
        {isLoading ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  )
}
