import { useState } from "react"
import type { SavedAddress, Chain } from "../types"
import styles from "./Sidebar.module.css"

interface Props {
  addresses: SavedAddress[]
  onAdd: (label: string, address: string, chain: Chain) => void
  onRemove: (id: string) => void
  onClick: (address: string) => void
}

export function SavedAddresses({ addresses, onAdd, onRemove, onClick }: Props) {
  const [label, setLabel] = useState("")
  const [addr, setAddr] = useState("")
  const [chain, setChain] = useState<Chain>("ethereum")
  const [adding, setAdding] = useState(false)

  const handleAdd = () => {
    if (!label.trim() || !addr.trim()) return
    onAdd(label.trim(), addr.trim(), chain)
    setLabel("")
    setAddr("")
    setAdding(false)
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Saved Addresses</h4>
        <button className={styles.addBtn} onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          <input className={styles.input} placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className={styles.input} placeholder="Address" value={addr} onChange={(e) => setAddr(e.target.value)} />
          <select className={styles.input} value={chain} onChange={(e) => setChain(e.target.value as Chain)}>
            <option value="ethereum">Ethereum</option>
            <option value="solana">Solana</option>
          </select>
          <button className={styles.addBtn} onClick={handleAdd}>Save</button>
        </div>
      )}

      {addresses.length === 0 && !adding && <p style={{ color: "#999", fontSize: 13 }}>No saved addresses</p>}

      {addresses.map((a) => (
        <div key={a.id} className={styles.listItem} style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onClick(a.address)}>
            <div className={styles.listItemTitle}>{a.label}</div>
            <div style={{ fontSize: 11, color: "#999" }}>{a.address.slice(0, 10)}... ({a.chain})</div>
          </div>
          <button className={styles.deleteBtn} onClick={() => onRemove(a.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
