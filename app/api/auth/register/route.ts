import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { promises as fs } from "fs"
import path from "path"
import { getJwtSecret } from "@/lib/auth"

const FILE = path.join(process.cwd(), "data", "users.json")

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")
    if (!email || !password) return Response.json({ error: "缺少邮箱或密码" }, { status: 400 })
    if (!email.includes("@")) return Response.json({ error: "邮箱格式错误" }, { status: 400 })
    if (password.length < 6) return Response.json({ error: "密码至少6位" }, { status: 400 })

    await fs.mkdir(path.dirname(FILE), { recursive: true })
    let users: { email: string; hash: string; createdAt: number }[] = []
    try {
      const txt = await fs.readFile(FILE, "utf-8")
      users = JSON.parse(txt) as { email: string; hash: string; createdAt: number }[]
    } catch {}
    if (users.find((u) => u.email === email)) return Response.json({ error: "邮箱已存在" }, { status: 409 })
    const hash = await bcrypt.hash(password, 10)
    users.push({ email, hash, createdAt: Date.now() })
    await fs.writeFile(FILE, JSON.stringify(users, null, 2), "utf-8")

    const token = jwt.sign({ email }, getJwtSecret(), { expiresIn: "7d" })
    const cookieStore = await cookies()
    cookieStore.set({ name: "auth", value: token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "服务异常" }, { status: 500 })
  }
}