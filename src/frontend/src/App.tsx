import { useState } from "react"
import { useChat } from "./hooks/useChat"
import styles from "./App.module.css"

function App() {
  const [input, setInput] = useState("")
  const { messages, sendMessage, isLoading } = useChat()

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput("")
  }

  return (
    <div className={styles.app}>
      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? styles.userMsg : styles.assistantMsg}>
            <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>
            <p>{msg.content || (isLoading && i === messages.length - 1 ? "Thinking..." : "")}</p>
            {msg.toolInfo && (
              <details className={styles.toolInfo}>
                <summary>{msg.toolInfo.name}</summary>
                <pre>{msg.toolInfo.result}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
      <div className={styles.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about blockchain data..."
          className={styles.input}
          disabled={isLoading}
        />
        <button onClick={handleSend} className={styles.button} disabled={isLoading}>Send</button>
      </div>
    </div>
  )
}

export default App
