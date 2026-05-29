import type { QuickAction } from "../../types"
import styles from "./PillRow.module.css"

interface PillRowProps {
  actions: QuickAction[]
  onAction: (action: QuickAction) => void
}

export function PillRow({ actions, onAction }: PillRowProps) {
  return (
    <div className={styles.pillRow}>
      <div className={styles.pillTrack}>
        {actions.map((a) => (
          <button key={a.id} className={styles.pill} onClick={() => onAction(a)}>
            <span>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
