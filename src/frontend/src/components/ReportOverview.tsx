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
      background: "linear-gradient(135deg, #1a237e, #283593)",
      color: "white",
      borderRadius: 10,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
        {chain === "ethereum" ? "Ethereum" : "Solana"} Wallet Report
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{label || address.slice(0, 10) + "..."}</div>
          {label && <div style={{ fontSize: 12, opacity: 0.7, fontFamily: "monospace", marginTop: 2 }}>{resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-6)}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>
            {parseFloat(balance.value).toLocaleString(undefined, { maximumFractionDigits: 4 })} {balance.unit}
          </div>
          {balance.usdValue && (
            <div style={{ fontSize: 14, opacity: 0.8, marginTop: 2 }}>
              ~ ${parseFloat(balance.usdValue).toLocaleString()} USD
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
