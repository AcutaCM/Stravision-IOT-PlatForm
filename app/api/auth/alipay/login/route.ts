import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const appId = process.env.ALIPAY_APP_ID
  if (!appId) {
    return NextResponse.json({ error: "未配置 ALIPAY_APP_ID" }, { status: 500 })
  }

  const url = new URL(req.url)
  // 优先使用环境变量配置的 APP_URL
  const origin = process.env.APP_URL || url.origin
  const redirectUri = `${origin}/api/auth/alipay/callback`
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)

  // 构造支付宝授权 URL
  // 使用 openauth.alipay.com 进行授权
  const alipayUrl = `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?app_id=${appId}&scope=auth_user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  const res = NextResponse.redirect(alipayUrl)
  
  // 存储 state 防止 CSRF
  res.cookies.set("alipay_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  })
  
  return res
}
