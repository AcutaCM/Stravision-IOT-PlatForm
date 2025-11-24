import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findOrCreateWeChatUser } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"

export async function GET(req: Request) {
  const appId = process.env.WECHAT_APP_ID
  const secret = process.env.WECHAT_APP_SECRET
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!appId || !secret) {
    return NextResponse.redirect(`/login?error=wechat_config`)
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get("wx_state")?.value
  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(`/login?error=wechat_state`)
  }

  try {
    const tokenResp = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`
    )
    const tokenJson = await tokenResp.json()

    const accessToken: string | undefined = tokenJson?.access_token
    const openid: string | undefined = tokenJson?.openid
    const unionid: string | undefined = tokenJson?.unionid

    if (!accessToken || !openid) {
      return NextResponse.redirect(`/login?error=wechat_token`)
    }

    let nickname: string | undefined
    let avatar: string | null = null
    try {
      const infoResp = await fetch(
        `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`
      )
      const infoJson = await infoResp.json()
      nickname = infoJson?.nickname
      avatar = infoJson?.headimgurl || null
    } catch {}

    const user = await findOrCreateWeChatUser({
      openid,
      unionid,
      nickname,
      avatar,
    })

    const jwt = generateToken({ id: user.id, email: user.email, username: user.username })
    await setAuthCookie(jwt)

    const res = NextResponse.redirect(`/monitor`)
    res.cookies.set("wx_state", "", { path: "/", maxAge: 0 })
    return res
  } catch (error) {
    console.error("微信登录回调处理失败:", error)
    return NextResponse.redirect(`/login?error=wechat_error`)
  }
}

