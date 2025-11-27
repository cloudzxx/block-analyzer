import type { ChatMessage as ChatMessageType } from "../types"
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
  if (content.toLowerCase().includes("balance") && /\d+\.?\d*\s*(ETH|SOL)/i.test(content)) {
    return <BalanceCard content={content} />
  }
  if (/\$\s*[\d,]+(?:\.\d+)?/.test(content) && content.toLowerCase().includes("price")) {
    return <PriceCard content={content} />
  }
  if (content.includes("|") && content.toLowerCase().includes("hash")) {
    return <TransactionTable content={content} chain={chain} />
  }
  const addrMatch = content.match(/0x[a-fA-F0-9]{40}/)
  if (addrMatch) {
    return (
      <>
        <p>{content}</p>
        <AddressBadge address={addrMatch[0]} chain={chain} />
      </>
    )
  }
  return <p>{content}</p>
}

export function ChatMessage({ message, isStreaming, chain }: Props) {
  return (
    <div
      className={`${styles.msg} ${message.role === "user" ? styles.userMsg : styles.assistantMsg}`}
    >
      <div className={styles.msgLabel}>
        {message.role === "user" ? "You" : "Assistant"}
      </div>
      {message.content && renderContent(message.content, chain)}
      {isStreaming && !message.content && (
        <span className={styles.thinking}>Thinking...</span>
      )}
      {message.toolCalls?.map((tc, i) => (
        <ToolCallCard key={i} call={tc} />
      ))}
    </div>
  )
}
