import type { Chain, QuickAction } from "../types"
import styles from "./TopBar.module.css"

interface TopBarProps {
  chain: Chain
  onChainChange: (chain: Chain) => void
  actions: QuickAction[]
  onAction: (action: QuickAction) => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function TopBar({ chain, onChainChange, actions, onAction, onToggleSidebar, sidebarOpen }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} title="Toggle sidebar">
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <span className={styles.logo}>⧫ Block Analyzer</span>
      </div>

      <select
        className={styles.chainSelect}
        value={chain}
        onChange={(e) => onChainChange(e.target.value as Chain)}
      >
        <option value="ethereum">Ethereum</option>
        <option value="solana">Solana</option>
      </select>

      <div className={styles.actions}>
        <button
          className={styles.analyzeBtn}
          onClick={() => onAction({ id: "analyze", icon: "🧠", label: "Analyze", prompt: () => "" })}
          title="Analyze wallet"
        >
          <span>🧠</span>
          <span className={styles.actionLabel}>Analyze</span>
        </button>
        {actions.map((a) => (
          <button
            key={a.id}
            className={styles.actionBtn}
            onClick={() => onAction(a)}
            title={a.label}
          >
            <span>{a.icon}</span>
            <span className={styles.actionLabel}>{a.label}</span>
          </button>
        ))}
      </div>
    </header>
  )
}
