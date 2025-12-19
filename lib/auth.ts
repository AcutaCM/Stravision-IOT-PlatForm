import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { getUserById, type UserPublic } from "./db/user-service"

/**
 * JWT 令牌 Payload 接口
 */
export interface JWTPayload {
  id: number
  email: string
  username: string
}

/**
 * 获取 JWT 密钥
 * @returns JWT 签名密钥
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === "development") {
    console.warn("警告: 未设置 JWT_SECRET 环境变量,使用默认密钥")
  }
  return secret || "dev-secret-change-in-production"
}

/**
 * 生成 JWT 令牌
 * @param payload 令牌载荷(包含用户 id, email, username)
 * @returns JWT 令牌字符串
 */
export function generateToken(payload: JWTPayload): string {
  const secret = getJwtSecret()
  return jwt.sign(payload, secret, {
    expiresIn: "7d", // 令牌有效期 7 天
  })
}

/**
 * 验证 JWT 令牌
 * @param token JWT 令牌字符串
 * @returns 验证成功返回 payload,失败返回 null
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = getJwtSecret()
    const decoded = jwt.verify(token, secret) as JWTPayload
    return decoded
  } catch (error) {
    // 令牌无效或过期
    return null
  }
}

/**
 * 设置认证 Cookie
 * @param token JWT 令牌
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === "production"
  
  cookieStore.set("auth", token, {
    httpOnly: true, // 防止 XSS 攻击
    sameSite: "lax", // 防止 CSRF 攻击
    secure: isProduction, // 生产环境仅允许 HTTPS
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天(秒)
  })
}

/**
 * 清除认证 Cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("auth")
}

/**
 * 从请求中获取当前用户
 * @returns 当前登录用户的公开信息,未登录返回 null
 */
export async function getCurrentUser(): Promise<UserPublic | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth")?.value

    if (!token) {
      return null
    }

    // 验证令牌
    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // 从数据库获取完整用户信息
    const user = await getUserById(payload.id)
    if (!user) {
      return null
    }

    return toPublicUser(user)
  } catch (error) {
    console.error("获取当前用户失败:", error)
    return null
  }
}