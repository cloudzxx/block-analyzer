import { useState } from "react"
import type { Session, SavedAddress, QueryTemplate, ToolInfo } from "../types"
import { SessionList } from "./SessionList"
import { SavedAddresses } from "./SavedAddresses"
import { QueryTemplates } from "./QueryTemplates"
import { CapabilitiesShowcase } from "./CapabilitiesShowcase"
import styles from "./Sidebar.module.css"

interface SidebarProps {
  open: boolean
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onCreateSession: () => void
  savedAddresses: SavedAddress[]
  onAddAddress: (label: string, address: string, chain: "ethereum" | "solana") => void
  onRemoveAddress: (id: string) => void
  onAddressClick: (address: string) => void
  onTemplateClick: (prompt: string) => void
  queryTemplates: QueryTemplate[]
  capabilities: ToolInfo[]
  onClose: () => void
}

type Tab = "sessions" | "addresses" | "templates" | "capabilities"

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "sessions", icon: "📋", label: "Sessions" },
  { id: "addresses", icon: "📍", label: "Addresses" },
  { id: "templates", icon: "⚡", label: "Templates" },
  { id: "capabilities", icon: "🔧", label: "Tools" },
]

export function Sidebar(props: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sessions")

  if (!props.open) return null

  return (
    <>
      <div className={styles.overlay} onClick={props.onClose} />
      <aside className={styles.sidebar}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.activeTab : ""}`}
              onClick={() => setActiveTab(t.id)}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>
        <div className={styles.content}>
          {activeTab === "sessions" && (
            <SessionList
              sessions={props.sessions}
              activeId={props.activeSessionId}
              onSelect={props.onSelectSession}
              onCreate={props.onCreateSession}
            />
          )}
          {activeTab === "addresses" && (
            <SavedAddresses
              addresses={props.savedAddresses}
              onAdd={props.onAddAddress}
              onRemove={props.onRemoveAddress}
              onClick={props.onAddressClick}
            />
          )}
          {activeTab === "templates" && (
            <QueryTemplates
              templates={props.queryTemplates}
              onClick={props.onTemplateClick}
            />
          )}
          {activeTab === "capabilities" && (
            <CapabilitiesShowcase tools={props.capabilities} />
          )}
        </div>
      </aside>
    </>
  )
}
