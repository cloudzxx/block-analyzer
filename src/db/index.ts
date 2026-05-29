import { Database } from "bun:sqlite"
import { SCHEMA } from "./schema"

let db: Database

// 初始化 SQLite 数据库（WAL 模式提升并发性能）
export function initDb(path: string = "data.db"): Database {
  db = new Database(path)
  db.exec("PRAGMA journal_mode=WAL") // WAL 模式：读写不互斥
  db.exec("PRAGMA foreign_keys=ON")  // 开启外键约束
  db.exec(SCHEMA)                    // 执行建表语句
  return db
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.")
  return db
}

export interface Session {
  id: string
  title: string
  createdAt: string
}

// 创建新会话（UUID 主键）
export function createSession(title: string): Session {
  const id = crypto.randomUUID()
  getDb().run("INSERT INTO sessions (id, title) VALUES (?, ?)", [id, title])
  return { id, title, createdAt: new Date().toISOString() }
}

// 获取所有会话，按时间降序排列
export function getSessions(): Session[] {
  return getDb()
    .query("SELECT id, title, created_at FROM sessions ORDER BY created_at DESC, ROWID DESC")
    .all()
    .map((r: any) => ({ id: r.id, title: r.title, createdAt: r.created_at }))
}

export function deleteSession(id: string): void {
  getDb().run("DELETE FROM sessions WHERE id = ?", [id])
}

export interface Message {
  id: number
  sessionId: string
  role: "user" | "assistant" | "tool"
  content: string
  toolCalls: string | null
  createdAt: string
}

// 添加消息到会话
export function addMessage(
  sessionId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  toolCalls?: string,
): void {
  getDb().run(
    "INSERT INTO messages (session_id, role, content, tool_calls) VALUES (?, ?, ?, ?)",
    [sessionId, role, content, toolCalls || null],
  )
}

// 查询会话的所有消息（按创建时间升序）
export function getMessages(sessionId: string): Message[] {
  return getDb()
    .query("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC")
    .all(sessionId)
    .map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      toolCalls: r.tool_calls,
      createdAt: r.created_at,
    }))
}
