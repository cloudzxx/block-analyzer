import { useState } from "react"
import type { ToolCallInfo } from "../../types"
import styles from "./ChatMessage.module.css"

const chainColors: Record<string, string> = {
  eth: "rgba(99, 102, 241, 0.1)",
  sol: "rgba(168, 85, 247, 0.1)",
  common: "transparent",
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
  const [showResult, setShowResult] = useState(call.status === "done" && !!call.result)
  const chain = detectChain(call.name)

  return (
    <div className={styles.toolCard}>
      <div className={styles.toolHeader} style={{ background: chainColors[chain] }}>
        <span className={styles.toolName}>{call.name}</span>
        <span className={styles.status}>
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
