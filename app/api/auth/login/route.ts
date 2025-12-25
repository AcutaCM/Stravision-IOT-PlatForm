import { verifyCredentials } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"
import { loginSchema } from "@/lib/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest } from "next/server"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { checkSuspiciousLogin, fetchIpLocation, recordLoginLog } from "@/lib/db/security-service"

export async function POST(req: NextRequest) {
  try {
    // Rate Limit: 5 attempts per minute
    const limiter = rateLimit(req, { limit: 5, windowMs: 60 * 1000 })
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
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    // 设置 httpOnly cookie
    await setAuthCookie(token)

    // 安全检查：异地登录检测
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    // 异步获取位置信息（尽量不阻塞主流程太久，但在 API 路由中 await 是最安全的）
    const location = await fetchIpLocation(ip)
    
    // 检查是否可疑（与历史记录对比）
    const suspiciousCheck = await checkSuspiciousLogin(user.id, ip, location?.region || null)
    
    // 记录本次登录
    await recordLoginLog(user.id, ip, userAgent, location)

    // 返回 UserPublic 信息
    return Response.json({ 
      ok: true, 
      user,
      warning: suspiciousCheck.isSuspicious ? {
        type: 'suspicious_login',
        message: `检测到异地登录 (IP: ${ip}${location?.region ? `, ${location.region}` : ''})，请确认是您本人操作。`,
        lastRegion: suspiciousCheck.lastRegion
      } : undefined
    })
  } catch (e) {
    console.error("登录失败:", e)
    return Response.json({ error: "服务异常" }, { status: 500 })
  }
}