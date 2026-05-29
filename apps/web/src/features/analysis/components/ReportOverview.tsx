interface Props {
  label?: string
  address: string
  resolvedAddress: string
  balance: { value: string; unit: string; usdValue: string | null }
  chain: string
}

export function ReportOverview({ label, address, resolvedAddress, balance, chain }: Props) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(10, 10, 15, 0.9))",
      backdropFilter: "blur(12px)",
      border: "1px solid var(--glass-border-strong)",
      borderRadius: 14,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 11,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 12,
      }}>
        {chain === "ethereum" ? "Ethereum" : "Solana"} Wallet Report
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            {label || address.slice(0, 10) + "..."}
          </div>
          {label && (
            <div style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
              marginTop: 4,
            }}>
              {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-6)}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: "var(--text-primary)",
          }}>
            {parseFloat(balance.value).toLocaleString(undefined, { maximumFractionDigits: 4 })} {balance.unit}
          </div>
          {balance.usdValue && (
            <div style={{
              fontSize: 14,
              color: "var(--accent-start)",
              marginTop: 2,
            }}>
              ~ ${parseFloat(balance.usdValue).toLocaleString()} USD
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
