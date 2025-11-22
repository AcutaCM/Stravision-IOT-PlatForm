import bcrypt from "bcryptjs"
import { promises as fs } from "fs"
import path from "path"

const USERS_FILE = path.join(process.cwd(), "data", "users.json")

async function readUsers() {
  try {
    const txt = await fs.readFile(USERS_FILE, "utf-8")
    return JSON.parse(txt) as { email: string; hash: string; createdAt?: number }[]
  } catch {
    return []
  }
}

export async function verifyCredentials(email: string, password: string) {
  const users = await readUsers()
  const u = users.find((x) => x.email === email.toLowerCase())
  if (u) {
    const ok = await bcrypt.compare(password, u.hash)
    if (ok) return { email: u.email }
  }

  const envEmail = process.env.AUTH_EMAIL
  const hash = process.env.AUTH_PASSWORD_BCRYPT
  const plain = process.env.AUTH_PASSWORD
  if (!envEmail || (!hash && !plain)) return null
  if (email !== envEmail) return null
  if (hash) {
    const ok = await bcrypt.compare(password, hash)
    return ok ? { email } : null
  }
  if (plain) {
    return password === plain ? { email } : null
  }
  return null
}

export function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-secret"
}