import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AlipaySdk } from 'alipay-sdk'
import { findOrCreateAlipayUser } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"

export async function GET(req: Request) {
  const url = new URL(req.url)
  // 优先使用环境变量配置的 APP_URL，解决容器/反代环境下 req.url 可能为内网IP的问题
  const appUrl = process.env.APP_URL || url.origin
  
  const authCode = url.searchParams.get("auth_code")
  const state = url.searchParams.get("state")
  
  const cookieStore = await cookies()
  const expectedState = cookieStore.get("alipay_state")?.value

  // 简单的 State 验证
  if (!authCode || !state || !expectedState || expectedState !== state) {
    console.error("Alipay state mismatch:", { authCode: !!authCode, state, expectedState })
    return NextResponse.redirect(`${appUrl}/login?error=alipay_state`)
  }

  const appId = process.env.ALIPAY_APP_ID
  const privateKey = process.env.ALIPAY_PRIVATE_KEY
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY // 支付宝公钥

  if (!appId || !privateKey || !alipayPublicKey) {
    console.error("Alipay configuration missing")
    return NextResponse.redirect(`${appUrl}/login?error=alipay_config`)
  }

  const alipaySdk = new AlipaySdk({
    appId,
    privateKey,
    alipayPublicKey,
    // 如果是沙箱环境，可以配置 gateway: 'https://openapi.alipaydev.com/gateway.do',
  })

  try {
    // 1. 使用 auth_code 换取 access_token
    // alipay.system.oauth.token
    const tokenResult: any = await alipaySdk.exec('alipay.system.oauth.token', {
      grant_type: 'authorization_code',
      code: authCode,
    })

    // alipay-sdk 返回的是 response body 中的内容
    const accessToken = tokenResult.accessToken || tokenResult.access_token
    
    if (!accessToken) {
      console.error("Failed to get alipay access token:", tokenResult)
      return NextResponse.redirect(`${appUrl}/login?error=alipay_token`)
    }

    // 2. 获取用户信息
    // alipay.user.info.share
    const userResult: any = await alipaySdk.exec('alipay.user.info.share', {
      auth_token: accessToken,
    })

    // 检查响应码，成功是 "10000"
    if (userResult.code && userResult.code !== '10000') {
        console.error("Failed to get alipay user info:", userResult)
        return NextResponse.redirect(`${appUrl}/login?error=alipay_user_info`)
    }

    const alipayUserId = userResult.userId || userResult.user_id
    console.log("Alipay Login Debug:", { alipayUserId, userResult })

    if (!alipayUserId) {
        console.error("Alipay user_id missing in response")
        return NextResponse.redirect(`${appUrl}/login?error=alipay_user_id_missing`)
    }

    // 3. 查找或创建用户
    const user = await findOrCreateAlipayUser({
      userId: alipayUserId,
      nickname: userResult.nickName || userResult.nick_name || "支付宝用户",
      avatar: userResult.avatar,
    })

    // 4. 登录
    const jwt = generateToken({ id: user.id, email: user.email, username: user.username })
    await setAuthCookie(jwt)

    const res = NextResponse.redirect(`${appUrl}/monitor`)
    res.cookies.set("alipay_state", "", { path: "/", maxAge: 0 })
    return res

  } catch (error: any) {
    console.error("Alipay callback error:", error)
    return NextResponse.redirect(`${appUrl}/login?error=alipay_error&message=${encodeURIComponent(error.message || "")}`)
  }
}
