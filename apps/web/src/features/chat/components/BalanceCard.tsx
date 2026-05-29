import styles from "./ChatMessage.module.css"

interface Props {
  content: string
  chain: string
}

export function BalanceCard({ content, chain }: Props) {
  const match = content.match(/(\d+(?:\.\d+)?)\s*(ETH|SOL)/i)
  const usdMatch = content.match(/\$?([\d,]+(?:\.\d+)?)\s*USD/i)

  return (
    <div className={styles.glassCard}>
      <div className={styles.glassCardHeader}>
        <div className={styles.glassIcon}>💰</div>
        <span>Balance</span>
        <span className={styles.networkChip}>{chain === "ethereum" ? "Ethereum" : "Solana"}</span>
      </div>
      <div className={styles.glassCardBody}>
        <div className={styles.balanceValue}>
          {match ? `${match[1]} ${match[2]}` : content}
        </div>
        {usdMatch && (
          <div className={styles.balanceUsd}>≈ ${usdMatch[1]} USD</div>
        )}
      </div>
    </div>
  )
}
