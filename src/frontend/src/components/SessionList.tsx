import type { Session } from "../types"
import styles from "./Sidebar.module.css"

interface Props {
  sessions: Session[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}

export function SessionList({ sessions, activeId, onSelect, onCreate }: Props) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Sessions</h4>
        <button className={styles.addBtn} onClick={onCreate}>+ New</button>
      </div>
      {sessions.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>No sessions yet</p>}
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`${styles.listItem} ${s.id === activeId ? styles.activeItem : ""}`}
          onClick={() => onSelect(s.id)}
        >
          <div className={styles.listItemTitle}>{s.title || "Untitled"}</div>
          <div className={styles.listItemDate}>{new Date(s.created_at).toLocaleDateString()}</div>
        </div>
      ))}
    </div>
  )
}
