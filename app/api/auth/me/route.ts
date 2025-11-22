import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getJwtSecret } from "@/lib/auth"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth")?.value
  if (!token) return Response.json({ authenticated: false })
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { email: string }
    return Response.json({ authenticated: true, user: { email: payload.email } })
  } catch {
    return Response.json({ authenticated: false }, { status: 401 })
  }
}