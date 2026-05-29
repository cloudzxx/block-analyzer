import { Router, type Request, type Response } from "express"
import { createSession, getSessions, deleteSession, getMessages } from "../db/index"

export function createSessionsRouter(): Router {
  const router = Router()

  router.get("/sessions", (_req: Request, res: Response) => {
    const sessions = getSessions()
    res.json(sessions)
  })

  router.post("/sessions", (req: Request, res: Response) => {
    const { title } = req.body as { title?: string }
    const session = createSession(title || "New Chat")
    res.status(201).json(session)
  })

  router.delete("/sessions/:id", (req: Request, res: Response) => {
    deleteSession(req.params.id as string)
    res.status(204).end()
  })

  router.get("/sessions/:id/messages", (req: Request, res: Response) => {
    const messages = getMessages(req.params.id as string)
    res.json(messages)
  })

  return router
}
