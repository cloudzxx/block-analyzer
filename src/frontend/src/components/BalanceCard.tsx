import styles from "./ChatMessage.module.css"

interface Props {
  content: string
}

export function BalanceCard({ content }: Props) {
  const match = content.match(/(\d+(?:\.\d+)?)\s*(ETH|SOL)/i)
  const usdMatch = content.match(/\$?([\d,]+(?:\.\d+)?)\s*USD/i)

  return (
    <div className={styles.balanceCard}>
      <div className={styles.balanceValue}>
        {match ? `${match[1]} ${match[2]}` : content}
      </div>
      {usdMatch && (
        <div className={styles.balanceUsd}>≈ ${usdMatch[1]} USD</div>
      )}
    </div>
  )
}
