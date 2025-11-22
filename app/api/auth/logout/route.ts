import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set({ name: "auth", value: "", path: "/", maxAge: 0 })
  return Response.json({ ok: true })
}