import { NextRequest } from "next/server"
import { createSession, listSessions } from "../../../lib/server/sessionStore"

export async function GET(_req: NextRequest) {
  try {
    const sessions = await listSessions()
    return Response.json({ sessions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    let title = "新会话"
    try {
      const body = await req.json()
      if (body && typeof body.title === "string" && body.title.trim()) title = body.title.trim()
    } catch {}
    const session = await createSession(title)
    return Response.json(session)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
