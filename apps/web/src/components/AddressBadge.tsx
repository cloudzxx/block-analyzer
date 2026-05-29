import { useState } from "react"

interface Props {
  address: string
  chain?: string
}

const explorers: Record<string, string> = {
  ethereum: "https://etherscan.io/address/",
  solana: "https://solscan.io/account/",
}

export function AddressBadge({ address, chain = "ethereum" }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const explorerUrl = (explorers[chain] || explorers.ethereum) + address

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(99, 102, 241, 0.12)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        borderRadius: 999,
        padding: "3px 12px",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        color: "var(--accent-start)",
      }}
    >
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener"
        style={{ color: "var(--accent-start)", textDecoration: "none" }}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </a>
      <button
        onClick={handleCopy}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          padding: 0,
          color: "var(--text-tertiary)",
        }}
      >
        {copied ? "✓" : "📋"}
      </button>
    </span>
  )
}
