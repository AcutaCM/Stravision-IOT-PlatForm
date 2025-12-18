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
    // 注意：alipay-sdk 可能会自动解包，也可能返回原始结构
    // 如果是原始结构，code 可能在 alipay_user_info_share_response 中
    const code = userResult.code || userResult.alipay_user_info_share_response?.code || userResult.alipayUserInfoShareResponse?.code;
    
    if (code && code !== '10000') {
        console.error("Failed to get alipay user info:", userResult)
        return NextResponse.redirect(`${appUrl}/login?error=alipay_user_info&code=${code}`)
    }

    console.log("Alipay User Result Keys:", Object.keys(userResult));

    const alipayUserId = userResult.userId || 
                         userResult.user_id || 
                         userResult.openId || 
                         userResult.open_id || 
                         userResult.alipay_user_info_share_response?.user_id ||
                         userResult.alipayUserInfoShareResponse?.userId ||
                         userResult.alipay_user_info_share_response?.open_id ||
                         userResult.alipayUserInfoShareResponse?.openId;

    console.log("Alipay Login Debug - Extracted ID:", alipayUserId)

    if (!alipayUserId) {
        console.error("Alipay user_id missing in response")
        const debugInfo = encodeURIComponent(JSON.stringify(userResult).slice(0, 200));
        return NextResponse.redirect(`${appUrl}/login?error=alipay_user_id_missing&debug=${debugInfo}`)
    }

    // 3. 查找或创建用户
    const user = await findOrCreateAlipayUser({
      userId: alipayUserId,
      nickname: userResult.nickName || userResult.nick_name || userResult.alipayUserInfoShareResponse?.nickName || "支付宝用户",
      avatar: userResult.avatar || userResult.alipayUserInfoShareResponse?.avatar,
    })

    // 4. 登录
    const jwt = generateToken({ id: user.id, email: user.email, username: user.username })
    
    // 注意：在 Next.js Route Handler 中，如果使用 cookies().set() 后直接返回 NextResponse.redirect，
    // Cookie 有时可能不会正确合并到响应头中。
    // 为了确保 Cookie 一定能种下，我们显式在 Response 对象上设置 Cookie。
    // await setAuthCookie(jwt) 

    const res = NextResponse.redirect(`${appUrl}/monitor`)
    
    // 强制设置 Cookie，确保兼容 HTTP 环境 (secure: false)
    // 如果您的生产环境启用了 HTTPS，可以考虑根据协议动态设置 secure
    res.cookies.set("auth", jwt, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // 允许 HTTP 访问 (解决云服务无 HTTPS 导致 Cookie 丢失的问题)
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 天
    })

    return res
  } catch (error: any) {
    console.error("Alipay callback error:", error)
    return NextResponse.redirect(`${appUrl}/login?error=alipay_error&message=${encodeURIComponent(error.message || "")}`)
  }
}
