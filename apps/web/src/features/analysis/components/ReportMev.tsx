interface Mev {
  classification: string
  privateTxCount: number
  multiTxBlockCount: number
  topOfBlockCount: number
  failedRatio: number
}

interface Props { mev?: Mev }

const LABELS: Record<string, { title: string; desc: string; color: string }> = {
  searcher_bot: {
    title: "MEV Searcher Bot",
    desc: "Arbitrage / sandwich / liquidation patterns: multi-tx blocks, top-of-block placement, competitive bidding",
    color: "#e0a82e",
  },
  mev_active: {
    title: "MEV-Active",
    desc: "Some MEV behavior detected, but not enough to classify as a dedicated searcher bot",
    color: "var(--accent-start)",
  },
  protected_user: {
    title: "Private Order Flow (Protected)",
    desc: "Uses Flashbots Protect to submit transactions privately and avoid sandwich attacks",
    color: "#3ea676",
  },
}

const metric = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
}

const metricValue = {
  fontSize: 18,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
}

const metricLabel = {
  fontSize: 10,
  color: "var(--text-tertiary)",
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
}

export function ReportMev({ mev }: Props) {
  if (!mev || mev.classification === "none") return null
  const info = LABELS[mev.classification] || {
    title: mev.classification,
    desc: "",
    color: "var(--text-tertiary)",
  }

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
        borderBottom: "1px solid var(--glass-border)",
      }}>
        <div style={{
          display: "inline-block",
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 6,
          border: `1px solid ${info.color}`,
          color: info.color,
        }}>
          {info.title}
        </div>
        {info.desc && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8, lineHeight: 1.5 }}>
            {info.desc}
          </div>
        )}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        padding: "14px 16px",
      }}>
        <div style={metric}>
          <span style={metricValue}>{mev.privateTxCount}</span>
          <span style={metricLabel}>Private Tx</span>
        </div>
        <div style={metric}>
          <span style={metricValue}>{mev.multiTxBlockCount}</span>
          <span style={metricLabel}>Multi-Tx Blocks</span>
        </div>
        <div style={metric}>
          <span style={metricValue}>{mev.topOfBlockCount}</span>
          <span style={metricLabel}>Top-of-Block</span>
        </div>
        <div style={metric}>
          <span style={metricValue}>{(mev.failedRatio * 100).toFixed(0)}%</span>
          <span style={metricLabel}>Failed Ratio</span>
        </div>
      </div>
    </div>
  )
}
