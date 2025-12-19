import { createUser } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"
import { registerSchema } from "@/lib/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest } from "next/server"
import { verifyTurnstileToken } from "@/lib/turnstile"

export async function POST(req: NextRequest) {
  try {
    // Rate Limit: 3 attempts per minute to prevent spam registration
    const limiter = rateLimit(req, { limit: 3, windowMs: 60 * 1000 })
    if (!limiter.success) {
      return Response.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 })
    }

    const body = await req.json()
    
    // 验证 Turnstile Token
    const turnstileToken = body.turnstileToken;
    if (!turnstileToken) {
        return Response.json({ error: "请完成验证码验证" }, { status: 400 });
    }

    const isHuman = await verifyTurnstileToken(turnstileToken);
    if (!isHuman) {
        return Response.json({ error: "验证码验证失败" }, { status: 400 });
    }

    // Use Zod to validate input
    const result = registerSchema.safeParse(body)
    
    if (!result.success) {
        return Response.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { email, password, username } = result.data

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