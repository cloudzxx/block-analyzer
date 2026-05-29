import { useState, useRef, useEffect } from "react"
import { useChat } from "./features/chat/hooks/useChat"
import { useChain } from "./hooks/useChain"
import { useSessions } from "./features/sessions/hooks/useSessions"
import { useSavedAddresses } from "./hooks/useSavedAddresses"
import { TopBar } from "./components/ui/TopBar"
import { Sidebar } from "./components/ui/Sidebar"
import { PillRow } from "./components/ui/PillRow"
import { ChatMessage } from "./features/chat/components/ChatMessage"
import { AnalyzeView } from "./features/analysis/components/AnalyzeView"
import { QUICK_ACTIONS, QUERY_TEMPLATES, CAPABILITIES } from "./constants"
import type { QuickAction } from "./types"
import styles from "./App.module.css"

const ADDRESS_ACTIONS = new Set(["balance", "txs", "tokens", "resolve"])

const ACTION_PLACEHOLDERS: Record<string, string> = {
  balance: "Enter address to check balance...",
  txs: "Enter address for transactions...",
  tokens: "Enter address for token balances...",
  resolve: "Enter ENS name or address to resolve...",
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<"chat" | "analyze">("chat")
  const [input, setInput] = useState("")
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const { chain, setChain } = useChain()
  const { sessions, activeId, setActiveId, createSession } = useSessions()
  const { addresses: savedAddresses, add: addAddress, remove: removeAddress } = useSavedAddresses()
  const { messages, sendMessage, isLoading, clearMessages } = useChat()

  useEffect(() => {
    if (pendingAction && inputRef.current) {
      inputRef.current.focus()
    }
  }, [pendingAction])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const resolveAction = (action: QuickAction, addr: string) => {
    setPendingAction(null)
    setInput("")
    sendMessage(action.prompt(addr))
  }

  const handleAction = (action: QuickAction) => {
    if (ADDRESS_ACTIONS.has(action.id) && !input.trim()) {
      setPendingAction(action)
      return
    }
    const prompt = action.prompt(input || undefined)
    setInput("")
    sendMessage(prompt)
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    if (pendingAction) {
      resolveAction(pendingAction, input.trim())
      return
    }
    sendMessage(input)
    setInput("")
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend()
    }
    if (e.key === "Escape" && pendingAction) {
      setPendingAction(null)
    }
  }

  const placeholder = pendingAction
    ? ACTION_PLACEHOLDERS[pendingAction.id] || "Enter address..."
    : "Ask about blockchain data..."

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
              <div className={styles.messages} ref={messagesRef}>
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
                {pendingAction && (
                  <span className={styles.pendingHint}>
                    {pendingAction.icon} {pendingAction.label}
                  </span>
                )}
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={placeholder}
                  className={styles.input}
                  disabled={isLoading}
                />
                <button onClick={handleSend} className={styles.button} disabled={isLoading || !input.trim()}>
                  {isLoading ? "..." : pendingAction ? "Go" : "Send"}
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
