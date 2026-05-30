import type { Chain } from "@/types"
import styles from "./TopBar.module.css"

interface TopBarProps {
  chain: Chain
  onChainChange: (chain: Chain) => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onAnalyzeClick: () => void
}

export function TopBar({ chain, onChainChange, onToggleSidebar, sidebarOpen, onAnalyzeClick }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} title="Toggle sidebar">
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <span className={styles.logo}><span className={styles.rainbowDiamond}>⧫</span> Block Analyzer</span>
      </div>
      <div className={styles.right}>
        <button className={styles.analyzeBtn} onClick={onAnalyzeClick}>
          🧠 Analyze
        </button>
        <select
          className={styles.chainSelect}
          value={chain}
          onChange={(e) => onChainChange(e.target.value as Chain)}
        >
          <option value="ethereum">Ethereum</option>
          <option value="solana">Solana</option>
        </select>
      </div>
    </header>
  )
}
