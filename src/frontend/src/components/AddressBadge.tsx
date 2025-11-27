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
        gap: 4,
        background: "#e3f2fd",
        borderRadius: 12,
        padding: "2px 10px",
        fontSize: 13,
        fontFamily: "monospace",
      }}
    >
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener"
        style={{ color: "#1976d2", textDecoration: "none" }}
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
          color: "#666",
        }}
      >
        {copied ? "\u2713" : "\uD83D\uDCCB"}
      </button>
    </span>
  )
}
