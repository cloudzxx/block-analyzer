import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { initDb, createSession, getSessions, deleteSession, addMessage, getMessages } from "./index"
import type { Database } from "bun:sqlite"

describe("db", () => {
  let db: Database

  beforeEach(() => {
    db = initDb(":memory:")
  })

  afterEach(() => {
    db.close()
  })

  it("creates a session and returns it", () => {
    const session = createSession("New Chat")
    expect(session.id).toBeString()
    expect(session.title).toBe("New Chat")
    expect(session.createdAt).toBeString()
  })

  it("lists sessions ordered by creation date desc", () => {
    createSession("First")
    createSession("Second")
    const list = getSessions()
    expect(list).toHaveLength(2)
    expect(list[0].title).toBe("Second")
  })

  it("deletes a session and its messages", () => {
    const s = createSession("To Delete")
    addMessage(s.id, "user", "hello")
    deleteSession(s.id)
    expect(getSessions()).toHaveLength(0)
    expect(getMessages(s.id)).toHaveLength(0)
  })

  it("adds and retrieves messages", () => {
    const s = createSession("Chat")
    addMessage(s.id, "user", "hi")
    addMessage(s.id, "assistant", "hello, how can I help?")
    const msgs = getMessages(s.id)
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe("user")
    expect(msgs[0].content).toBe("hi")
    expect(msgs[1].role).toBe("assistant")
  })
})
