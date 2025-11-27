import { useState } from "react"
import type { ToolCallInfo } from "../types"
import styles from "./ChatMessage.module.css"

const chainIcons: Record<string, string> = {
  eth: "🔵",
  sol: "🟣",
}

const chainColors: Record<string, string> = {
  eth: "#e3f2fd",
  sol: "#f3e5f5",
  common: "#f5f5f5",
}

function detectChain(name: string): string {
  if (name.startsWith("eth")) return "eth"
  if (name.startsWith("sol")) return "sol"
  return "common"
}

interface Props {
  call: ToolCallInfo
}

export function ToolCallCard({ call }: Props) {
  const [showArgs, setShowArgs] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const chain = detectChain(call.name)

  return (
    <div className={styles.toolCard}>
      <div className={styles.toolHeader} style={{ background: chainColors[chain] }}>
        <span>{chainIcons[chain] || "⚙️"}</span>
        <code className={styles.toolName}>{call.name}</code>
        <span className={`${styles.status} ${styles[call.status]}`}>
          {call.status === "running" ? "⏳" : call.status === "done" ? "✅" : "❌"}
        </span>
      </div>
      <div className={styles.toolBody}>
        <div className={styles.toggle} onClick={() => setShowArgs(!showArgs)}>
          {showArgs ? "▼" : "▶"} Args
        </div>
        {showArgs && <pre className={styles.codeBlock}>{call.args}</pre>}
        {call.result && (
          <>
            <div className={styles.toggle} onClick={() => setShowResult(!showResult)}>
              {showResult ? "▼" : "▶"} Result
            </div>
            {showResult && <pre className={styles.codeBlock}>{call.result}</pre>}
          </>
        )}
      </div>
    </div>
  )
}
