import { verifyCredentials } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"
import { loginSchema } from "@/lib/validations/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Use Zod to validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return Response.json({ error: "缺少邮箱或密码" }, { status: 400 })
    }

    const { email, password } = result.data

    // 使用 user-service 的 verifyCredentials() 验证用户
    const user = await verifyCredentials(email, password)
    if (!user) {
      return Response.json({ error: "邮箱或密码错误" }, { status: 401 })
    }

    // 生成包含 id, email, username 的 JWT 令牌
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    // 设置 httpOnly cookie
    await setAuthCookie(token)

    // 返回 UserPublic 信息
    return Response.json({ ok: true, user })
  } catch (e) {
    console.error("登录失败:", e)
    return Response.json({ error: "服务异常" }, { status: 500 })
  }
}