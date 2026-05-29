import { useState, useEffect, useCallback } from "react"
import type { Session } from "../../../types"

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || data || [])
      }
    } catch {}
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const createSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setSessions((prev) => [data.session || data, ...prev])
        setActiveId(data.session?.id || data.id)
      }
    } catch {}
  }, [])

  return { sessions, activeId, setActiveId, createSession, refresh: fetchSessions }
}
