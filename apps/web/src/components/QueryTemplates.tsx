import type { QueryTemplate } from "../types"

interface Props {
  templates: QueryTemplate[]
  onClick: (prompt: string) => void
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
}

const cardStyle: React.CSSProperties = {
  padding: 10,
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: 8,
  cursor: "pointer",
  transition: "border-color 0.15s",
  textAlign: "left",
}

const iconStyle: React.CSSProperties = { fontSize: 20, marginBottom: 4 }

export function QueryTemplates({ templates, onClick }: Props) {
  return (
    <div>
      <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-primary)" }}>Quick Queries</h4>
      <div style={gridStyle}>
        {templates.map((t, i) => (
          <div key={i} style={cardStyle} onClick={() => onClick(t.prompt)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-start)" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)" }}
          >
            <div style={iconStyle}>{t.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{t.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{t.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
