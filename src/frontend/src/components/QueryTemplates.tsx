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
  background: "white",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  cursor: "pointer",
  transition: "border-color 0.15s",
  textAlign: "left",
}

const iconStyle: React.CSSProperties = { fontSize: 20, marginBottom: 4 }

export function QueryTemplates({ templates, onClick }: Props) {
  return (
    <div>
      <h4 style={{ margin: "0 0 8px" }}>Quick Queries</h4>
      <div style={gridStyle}>
        {templates.map((t, i) => (
          <div key={i} style={cardStyle} onClick={() => onClick(t.prompt)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1976d2" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0e0e0" }}
          >
            <div style={iconStyle}>{t.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{t.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
