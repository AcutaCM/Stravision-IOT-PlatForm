import { promises as fs } from "fs"
import path from "path"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
  citations?: Array<{ number: string; title: string; url: string; description?: string; quote?: string }>
  reasoning?: { text: string; durationMs?: number }
  tasks?: Array<{ title: string; items: Array<{ type: "text" | "file"; text: string; file?: { name: string; icon?: string } }>; status: "pending" | "in_progress" | "completed" }>
}

type SessionMeta = { id: string; title: string; createdAt: number; updatedAt: number }
type Store = { sessions: SessionMeta[]; messagesById: Record<string, ChatMessage[]> }

const DATA_DIR = path.join(process.cwd(), "data")
const FILE_PATH = path.join(DATA_DIR, "sessions.json")

async function ensureFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(FILE_PATH)
  } catch {
    const empty: Store = { sessions: [], messagesById: {} }
    await fs.writeFile(FILE_PATH, JSON.stringify(empty, null, 2), "utf-8")
  }
}

async function readStore(): Promise<Store> {
  await ensureFile()
  const raw = await fs.readFile(FILE_PATH, "utf-8")
  try {
    const parsed = JSON.parse(raw) as unknown
    const store = parsed as Store
    if (!store.sessions) store.sessions = []
    if (!store.messagesById) store.messagesById = {}
    return store
  } catch {
    const empty: Store = { sessions: [], messagesById: {} }
    await fs.writeFile(FILE_PATH, JSON.stringify(empty, null, 2), "utf-8")
    return empty
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export async function listSessions(): Promise<SessionMeta[]> {
  const store = await readStore()
  return store.sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createSession(title: string): Promise<SessionMeta> {
  const store = await readStore()
  const id = `${Date.now()}`
  const now = Date.now()
  const meta: SessionMeta = { id, title, createdAt: now, updatedAt: now }
  store.sessions.push(meta)
  store.messagesById[id] = []
  await writeStore(store)
  return meta
}

export async function getMessages(id: string): Promise<ChatMessage[]> {
  const store = await readStore()
  return store.messagesById[id] ?? []
}

export async function saveMessages(id: string, messages: ChatMessage[]): Promise<void> {
  const store = await readStore()
  if (!store.messagesById[id]) {
    const title = `会话 ${id}`
    const now = Date.now()
    store.sessions.push({ id, title, createdAt: now, updatedAt: now })
    store.messagesById[id] = []
  }
  store.messagesById[id] = messages
  const meta = store.sessions.find(s => s.id === id)
  if (meta) meta.updatedAt = Date.now()
  await writeStore(store)
}

export async function deleteSession(id: string): Promise<void> {
  const store = await readStore()
  store.sessions = store.sessions.filter(s => s.id !== id)
  delete store.messagesById[id]
  await writeStore(store)
}

export async function updateSessionTitle(id: string, title: string): Promise<void> {
  const store = await readStore()
  const meta = store.sessions.find(s => s.id === id)
  if (meta) {
    meta.title = title
    meta.updatedAt = Date.now()
    await writeStore(store)
  }
}
