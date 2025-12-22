import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

function isMobileUA(ua: string | null, chMobile: string | null) {
  if (chMobile === "?1") return true
  if (!ua) return false
  const u = ua.toLowerCase()
  if (u.includes("ipad") || u.includes("tablet")) return false
  const hasAndroidMobile = u.includes("android") && (u.includes("mobile") || u.includes("mobi"))
  const hasIphone = u.includes("iphone") || u.includes("ipod")
  const hasWindowsPhone = u.includes("windows phone")
  const hasGenericMobile = u.includes("mobi") || u.includes("mobile")
  return hasAndroidMobile || hasIphone || hasWindowsPhone || hasGenericMobile
}

export function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const pathname = url.pathname

  // 0. Global Rate Limiting (API & Auth routes)
  // Protect sensitive endpoints from brute force / DoS
  if (pathname.startsWith("/api") || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    const isAuthApi = pathname.startsWith("/api/auth");
    const limit = isAuthApi ? 10 : 60; // 10 requests per minute for auth, 60 for others
    const windowMs = 60 * 1000;
    
    const result = rateLimit(req, { limit, windowMs });
    if (!result.success) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // 1. Admin Protection (Stealth Mode)
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("auth")?.value
    // If no token, pretend it doesn't exist (404) or redirect to home to avoid detection
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url))
    }
    // Note: Role check happens in layout/page server components for security
  }

  // 2. Authentication Check (Security)
  // 检查是否访问受保护的路由
  const protectedPaths = [
    "/dashboard", 
    "/monitor", 
    "/device-control", 
    "/settings", 
    "/profile",
    "/ai-assistant"
  ]
  
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtected) {
    const token = req.cookies.get("auth")?.value
    if (!token) {
      // 如果没有 auth cookie，重定向到登录页
      const loginUrl = new URL("/login", req.url)
      // Add return URL for better UX
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl)
    }
  }

  // 3. Mobile Redirection (UX)
  const ua = req.headers.get("user-agent")
  const chMobile = req.headers.get("sec-ch-ua-mobile")
  const mobile = isMobileUA(ua, chMobile)

  const mapping: Record<string, string> = {
    "/monitor": "/monitor-ios",
    "/device-control": "/device-control-ios",
    "/dashboard": "/dashboard-ios",
    "/ai-assistant": "/ai-assistant-ios"
  }

  // Only redirect if explicitly accessing the desktop version while on mobile
  // and avoid infinite loops or redirecting API calls
  if (mobile && mapping[pathname]) {
    const target = mapping[pathname]
    const nextUrl = new URL(req.url)
    nextUrl.pathname = target
    return NextResponse.rewrite(nextUrl)
  }

  const response = NextResponse.next()

  // 4. Security Headers
  // Add basic security headers to every response
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  return response
}

export const config = {
  // 匹配所有受保护的路由、API路由和需要移动端适配的路由
  matcher: [
    "/dashboard/:path*", 
    "/monitor/:path*", 
    "/device-control/:path*", 
    "/settings/:path*",
    "/profile/:path*",
    "/ai-assistant/:path*",
    "/admin/:path*",
    "/api/:path*",     // Add API routes for rate limiting
    "/login",          // Add login page
    "/register"        // Add register page
  ],
}
