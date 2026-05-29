import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import express from "express"
import { createSessionsRouter } from "./sessions"
import { initDb } from "../../../../storage/warehouse/index"
import type { Database } from "bun:sqlite"

describe("Sessions API", () => {
  let db: Database
  let server: any
  let port: number

  beforeEach(() => {
    db = initDb(":memory:")
    const app = express()
    app.use(express.json())
    app.use("/api", createSessionsRouter())
    server = app.listen(0)
    port = (server.address() as any).port
  })

  afterEach(() => {
    server.close()
    db.close()
  })

  it("POST /api/sessions creates a session", async () => {
    const res = await fetch(`http://localhost:${port}/api/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Test Chat" }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.title).toBe("Test Chat")
    expect(data.id).toBeString()
  })

  it("GET /api/sessions returns sessions list", async () => {
    await fetch(`http://localhost:${port}/api/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Chat 1" }),
    })
    const res = await fetch(`http://localhost:${port}/api/sessions`)
    expect((await res.json())).toHaveLength(1)
  })

  it("DELETE /api/sessions removes a session", async () => {
    const create = await fetch(`http://localhost:${port}/api/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    })
    const { id } = await create.json()
    const del = await fetch(`http://localhost:${port}/api/sessions/${id}`, { method: "DELETE" })
    expect(del.status).toBe(204)
  })
})
