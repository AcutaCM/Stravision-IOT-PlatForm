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

  // 检测是否移动端
  const userAgent = req.headers.get("user-agent") || ""
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

  if (isMobile) {
    // 之前使用 alipays:// 协议强制唤起 APP 会导致回调在支付宝 APP 内执行，
    // 从而导致浏览器端无法获取登录态（Cookie 丢失）。
    // 现在的方案是：使用标准 HTTPS 链接，让支付宝的 H5 页面自动处理 APP 唤起和浏览器回调。
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>正在跳转支付宝...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 40px 20px; }
    .btn { display: block; width: 100%; max-width: 300px; margin: 20px auto; padding: 12px 0; background: #1677FF; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
    p { color: #666; margin-bottom: 30px; }
  </style>
</head>
<body>
  <h3>正在跳转支付宝登录</h3>
  <p>请在弹出的页面中点击"打开"或进行授权</p>
  <a href="${alipayUrl}" class="btn">点击跳转</a>
  <script>
    // 尝试自动跳转
    window.location.href = "${alipayUrl}";
  </script>
</body>
</html>
    `
    const res = new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
    res.cookies.set("alipay_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // 强制允许 HTTP，防止云服务无 HTTPS 导致 Cookie 丢失
      path: "/",
      maxAge: 300,
    })
    return res
  }

  const res = NextResponse.redirect(alipayUrl)
  
  // 存储 state 防止 CSRF
  res.cookies.set("alipay_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // 强制允许 HTTP，防止云服务无 HTTPS 导致 Cookie 丢失
    path: "/",
    maxAge: 300,
  })
  
  return res
}
