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
    // 构造支付宝 Scheme 链接，强制唤起 APP
    // 注意：url 参数需要进行二次编码，防止参数丢失
    const schemeUrl = `alipays://platformapi/startapp?appId=20000067&url=${encodeURIComponent(alipayUrl)}`

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
    .secondary-btn { display: block; margin-top: 15px; color: #666; font-size: 14px; text-decoration: underline; }
    p { color: #666; margin-bottom: 30px; line-height: 1.5; }
    .tip { font-size: 12px; color: #999; margin-top: 40px; }
  </style>
</head>
<body>
  <h3>正在跳转支付宝登录</h3>
  <p>请在弹出的窗口中点击"打开"以授权登录</p>
  
  <a href="${schemeUrl}" class="btn">打开支付宝 APP</a>
  
  <div class="tip">
    <p>注意：授权完成后，系统可能会在支付宝 APP 内继续运行。<br>这是为了确保登录状态的安全性。</p>
  </div>

  <script>
    // 尝试自动唤起
    setTimeout(function() {
      window.location.href = "${schemeUrl}";
    }, 300);
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
