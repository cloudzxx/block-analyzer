import styles from "./ChatMessage.module.css"

interface TxRow {
  hash: string
  from: string
  to: string
  value: string
  time?: string
}

interface Props {
  content: string
  chain: string
}

function parseTransactions(text: string): TxRow[] {
  const rows: TxRow[] = []
  const lines = text.split("\n")
  for (const line of lines) {
    const parts = line.split("|").map(s => s.trim())
    if (parts.length >= 4) {
      rows.push({ hash: parts[0], from: parts[1], to: parts[2], value: parts[3], time: parts[4] })
    }
  }
  return rows
}

export function TransactionTable({ content, chain }: Props) {
  const txs = parseTransactions(content)
  if (txs.length === 0) return <pre style={{ fontSize: 12, color: "var(--text-secondary)" }}>{content}</pre>

  const explorer = chain === "solana" ? "https://solscan.io/tx/" : "https://etherscan.io/tx/"

  return (
    <div className={styles.glassCard}>
      <div className={styles.glassCardHeader}>
        <div className={styles.glassIcon}>📊</div>
        <span>Transactions</span>
        <span style={{ marginLeft: "auto", color: "var(--text-tertiary)", fontSize: 11 }}>{txs.length} txs</span>
      </div>
      <div className={styles.glassCardBody} style={{ padding: 0 }}>
        <div className={styles.tableWrapper}>
          <table className={styles.txTable}>
            <thead>
              <tr>
                <th>Hash</th>
                <th>From</th>
                <th>To</th>
                <th>Value</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => (
                <tr key={i} className={styles.txRow}>
                  <td>
                    <a href={explorer + tx.hash} target="_blank" rel="noopener">
                      {tx.hash.slice(0, 10)}...
                    </a>
                  </td>
                  <td style={{ fontSize: 11 }}>{tx.from.slice(0, 8)}...</td>
                  <td style={{ fontSize: 11 }}>{tx.to.slice(0, 8)}...</td>
                  <td className={tx.value.startsWith("-") ? styles.negative : styles.positive}>
                    {tx.value}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{tx.time || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
