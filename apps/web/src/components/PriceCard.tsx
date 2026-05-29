import styles from "./ChatMessage.module.css"

interface Props {
  content: string
}

export function PriceCard({ content }: Props) {
  const priceMatch = content.match(/\$?([\d,]+(?:\.\d+)?)/)
  const changeMatch = content.match(/(-?\d+\.?\d*)%/g)

  return (
    <div className={styles.glassCard}>
      <div className={styles.glassCardHeader}>
        <div className={styles.glassIcon}>💹</div>
        <span>ETH Price</span>
      </div>
      <div className={styles.glassCardBody}>
        <div className={styles.priceValue}>
          ${priceMatch ? priceMatch[1] : content}
        </div>
        {changeMatch && (
          <div className={changeMatch[0].startsWith("-") ? styles.priceDown : styles.priceUp}>
            {changeMatch[0]}
          </div>
        )}
      </div>
    </div>
  )
}
