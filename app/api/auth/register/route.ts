import { createUser } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")
    const username = String(body?.username || "").trim()

    // 验证必填字段
    if (!email || !password || !username) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 })
    }

    // 验证邮箱格式
    if (!email.includes("@")) {
      return Response.json({ error: "邮箱格式不正确" }, { status: 400 })
    }

    // 验证密码长度(至少8个字符)
    if (password.length < 8) {
      return Response.json({ error: "密码至少需要8个字符" }, { status: 400 })
    }

    // 验证用户名长度(2-20个字符)
    if (username.length < 2 || username.length > 20) {
      return Response.json({ error: "用户名长度需在2-20个字符之间" }, { status: 400 })
    }

    // 使用 user-service 创建用户(保存到数据库)
    const user = await createUser({
      email,
      password,
      username,
    })

    // 生成包含完整用户信息的 JWT 令牌
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    // 设置 httpOnly cookie
    await setAuthCookie(token)

    // 返回 UserPublic 信息
    return Response.json({
      ok: true,
      user,
    })
  } catch (error) {
    // 处理邮箱已存在的错误
    if (error instanceof Error && error.message.includes("该邮箱已被注册")) {
      return Response.json({ error: "该邮箱已被注册" }, { status: 409 })
    }

    console.error("注册失败:", error)
    return Response.json({ error: "服务异常,请稍后重试" }, { status: 500 })
  }
}