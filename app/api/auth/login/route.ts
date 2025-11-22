import { cookies } from "next/headers"
import { verifyCredentials, getJwtSecret } from "@/lib/auth"
import jwt from "jsonwebtoken"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || "").trim()
    const password = String(body?.password || "")
    if (!email || !password) {
      return Response.json({ error: "缺少邮箱或密码" }, { status: 400 })
    }
    const user = await verifyCredentials(email, password)
    if (!user) {
      return Response.json({ error: "账户或密码错误" }, { status: 401 })
    }
    const token = jwt.sign({ email: user.email }, getJwtSecret(), { expiresIn: "7d" })
    const cookieStore = await cookies()
    cookieStore.set({
      name: "auth",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: "服务异常" }, { status: 500 })
  }
}