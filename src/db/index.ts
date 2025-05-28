import { Database } from "bun:sqlite"
import { SCHEMA } from "./schema"

let db: Database

export function initDb(path: string = "data.db"): Database {
  db = new Database(path)
  db.exec("PRAGMA journal_mode=WAL")
  db.exec("PRAGMA foreign_keys=ON")
  db.exec(SCHEMA)
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

export function createSession(title: string): Session {
  const id = crypto.randomUUID()
  getDb().run("INSERT INTO sessions (id, title) VALUES (?, ?)", [id, title])
  return { id, title, createdAt: new Date().toISOString() }
}

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
