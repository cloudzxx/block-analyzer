import { useState } from "react"
import { useChat } from "./hooks/useChat"
import { useChain } from "./hooks/useChain"
import { useSessions } from "./hooks/useSessions"
import { useSavedAddresses } from "./hooks/useSavedAddresses"
import { TopBar } from "./components/TopBar"
import { Sidebar } from "./components/Sidebar"
import { PillRow } from "./components/PillRow"
import { ChatMessage } from "./components/ChatMessage"
import { AnalyzeView } from "./components/AnalyzeView"
import { QUICK_ACTIONS, QUERY_TEMPLATES, CAPABILITIES } from "./types"
import type { QuickAction } from "./types"
import styles from "./App.module.css"

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<"chat" | "analyze">("chat")
  const [input, setInput] = useState("")
  const { chain, setChain } = useChain()
  const { sessions, activeId, setActiveId, createSession } = useSessions()
  const { addresses: savedAddresses, add: addAddress, remove: removeAddress } = useSavedAddresses()
  const { messages, sendMessage, isLoading, clearMessages } = useChat()

  const handleAction = (action: QuickAction) => {
    const prompt = action.prompt(input || undefined)
    setInput("")
    sendMessage(prompt)
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput("")
  }

  const handleSelectSession = (_id: string) => {
    clearMessages()
  }

  const handleCreateSession = async () => {
    await createSession()
    clearMessages()
  }

  const handleAddressClick = (address: string) => {
    sendMessage(`Analyze address ${address} on ${chain}`)
  }

  const handleTemplateClick = (prompt: string) => {
    sendMessage(prompt)
  }

  return (
    <div className={styles.app}>
      <TopBar
        chain={chain}
        onChainChange={setChain}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onAnalyzeClick={() => setActiveView("analyze")}
      />
      <PillRow actions={QUICK_ACTIONS} onAction={handleAction} />
      <div className={styles.main}>
        <Sidebar
          open={sidebarOpen}
          sessions={sessions}
          activeSessionId={activeId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          savedAddresses={savedAddresses}
          onAddAddress={addAddress}
          onRemoveAddress={removeAddress}
          onAddressClick={handleAddressClick}
          onTemplateClick={handleTemplateClick}
          queryTemplates={QUERY_TEMPLATES}
          capabilities={CAPABILITIES}
          onClose={() => setSidebarOpen(false)}
        />
        <div className={styles.chatArea}>
          <div className={styles.viewTabs}>
            <button
              className={`${styles.viewTab} ${activeView === "chat" ? styles.activeViewTab : ""}`}
              onClick={() => setActiveView("chat")}
            >
              💬 Chat
            </button>
            <button
              className={`${styles.viewTab} ${activeView === "analyze" ? styles.activeViewTab : ""}`}
              onClick={() => setActiveView("analyze")}
            >
              🧠 Analyze
            </button>
          </div>
          {activeView === "chat" ? (
            <>
              <div className={styles.messages}>
                {messages.length === 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>&#x29EB;</div>
                    <h2>Block Analyzer</h2>
                    <p>Analyze on-chain data across Ethereum and Solana. Try a quick action above or type a question.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    message={msg}
                    isStreaming={isLoading && i === messages.length - 1 && msg.role === "assistant"}
                    chain={chain}
                  />
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
                <button onClick={handleSend} className={styles.button} disabled={isLoading}>
                  {isLoading ? "..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <AnalyzeView chain={chain} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
