import { NextRequest } from "next/server"
import { deleteSession, getMessages, saveMessages, ChatMessage, updateSessionTitle } from "../../../../lib/server/sessionStore"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const messages = await getMessages(id)
    return Response.json({ messages })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const raw = Array.isArray(body?.messages) ? body.messages : []
    const messages: ChatMessage[] = raw.map((m: any) => ({
      role: m?.role === "user" ? "user" : "assistant",
      content: String(m?.content ?? ""),
      citations: Array.isArray(m?.citations) ? m.citations : undefined,
      reasoning: m?.reasoning && typeof m.reasoning === "object" ? { text: String(m.reasoning.text ?? ""), durationMs: typeof m.reasoning.durationMs === "number" ? m.reasoning.durationMs : undefined } : undefined,
      tasks: Array.isArray(m?.tasks) ? m.tasks : undefined,
    }))
    await saveMessages(id, messages)
    return Response.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteSession(id)
    return Response.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const title = typeof body?.title === "string" ? body.title : ""
    await updateSessionTitle(id, title)
    return Response.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
