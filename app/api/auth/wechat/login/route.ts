import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const appId = process.env.WECHAT_APP_ID
  if (!appId) {
    return NextResponse.json({ error: "未配置 WECHAT_APP_ID" }, { status: 500 })
  }

  const url = new URL(req.url)
  const origin = url.origin
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const redirectUri = `${origin}/api/auth/wechat/callback`

  const wechatUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`

  const res = NextResponse.redirect(wechatUrl)
  res.cookies.set("wx_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  })
  return res
}
