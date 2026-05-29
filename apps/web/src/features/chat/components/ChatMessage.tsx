import type { ChatMessage as ChatMessageType } from "../../types"
import { ToolCallCard } from "./ToolCallCard"
import { BalanceCard } from "./BalanceCard"
import { TransactionTable } from "./TransactionTable"
import { PriceCard } from "./PriceCard"
import { AddressBadge } from "./AddressBadge"
import styles from "./ChatMessage.module.css"

interface Props {
  message: ChatMessageType
  isStreaming?: boolean
  chain: string
}

function renderContent(content: string, chain: string) {
  const hasBalance = content.toLowerCase().includes("balance") && /\d+\.?\d*\s*(ETH|SOL)/i.test(content)
  const hasPrice = /\$\s*[\d,]+(?:\.\d+)?/.test(content) && content.toLowerCase().includes("price")
  const hasTable = content.includes("│") || (content.includes("|") && content.toLowerCase().includes("hash"))
  const addrMatch = content.match(/0x[a-fA-F0-9]{40}/)

  if (hasBalance) {
    return <BalanceCard content={content} chain={chain} />
  }
  if (hasPrice) {
    return <PriceCard content={content} />
  }
  if (hasTable) {
    return <TransactionTable content={content} chain={chain} />
  }
  if (addrMatch) {
    return (
      <>
        <span>{content}</span>
        <AddressBadge address={addrMatch[0]} chain={chain} />
      </>
    )
  }
  return <span>{content}</span>
}

export function ChatMessage({ message, isStreaming, chain }: Props) {
  return (
    <div
      className={`${styles.msg} ${message.role === "user" ? styles.userMsg : styles.assistantMsg}`}
    >
      <div className={styles.msgBubble}>
        {message.content && renderContent(message.content, chain)}
        {isStreaming && !message.content && (
          <span className={styles.thinking}>Thinking...</span>
        )}
      </div>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {message.toolCalls.map((tc, i) => (
            <ToolCallCard key={i} call={tc} />
          ))}
        </div>
      )}
    </div>
  )
}
