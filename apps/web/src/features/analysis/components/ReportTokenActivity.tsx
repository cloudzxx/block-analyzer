interface Props {
  chain: string
  ethTransferVolume?: string
  topTokens?: Array<{ symbol: string; contractAddress: string; transferCount: number }>
  programActivity?: Array<{ programId: string; label: string; count: number }>
  tokenTransferVolume?: string
}

const card = {
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: 12,
  marginBottom: 16,
  overflow: "hidden" as const,
}

const header = {
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
  borderBottom: "1px solid var(--glass-border)",
}

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 16px",
  borderTop: "1px solid var(--glass-border)",
  fontSize: 12,
}

export function ReportTokenActivity({
  chain,
  ethTransferVolume,
  topTokens,
  programActivity,
  tokenTransferVolume,
}: Props) {
  const hasEthTokens = chain === "ethereum" && topTokens && topTokens.length > 0
  const hasSolPrograms = chain === "solana" && programActivity && programActivity.length > 0
  const volume = chain === "ethereum" ? ethTransferVolume : tokenTransferVolume
  const volumeUnit = chain === "ethereum" ? "ETH" : "SOL"

  if (!hasEthTokens && !hasSolPrograms && !volume) return null

  return (
    <div style={card}>
      <div style={header}>
        {chain === "ethereum" ? "Token Activity" : "Program Activity"}
      </div>

      {volume && (
        <div style={row}>
          <span style={{ color: "var(--text-tertiary)" }}>
            Native Transfer Volume
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            {parseFloat(volume).toLocaleString(undefined, { maximumFractionDigits: 4 })} {volumeUnit}
          </span>
        </div>
      )}

      {hasEthTokens && topTokens!.map((t, i) => (
        <div key={i} style={row}>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {t.symbol || t.contractAddress.slice(0, 8) + "..."}
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>
            {t.transferCount} transfers
          </span>
        </div>
      ))}

      {hasSolPrograms && programActivity!.map((p, i) => (
        <div key={i} style={row}>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {p.label}
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>
            {p.count} calls
          </span>
        </div>
      ))}
    </div>
  )
}
