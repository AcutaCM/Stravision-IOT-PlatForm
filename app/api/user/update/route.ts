import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { updateUser } from "@/lib/db/user-service"

/**
 * PUT /api/user/update
 * 更新当前用户信息
 */
export async function PUT(req: Request) {
  try {
    // 获取当前登录用户
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    const username = String(body?.username || "").trim()
    const avatar_url = body?.avatar_url ? String(body.avatar_url).trim() : null
    
    // 验证用户名
    if (!username) {
      return NextResponse.json(
        { error: "用户名不能为空" },
        { status: 400 }
      )
    }
    
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "用户名长度需在2-20个字符之间" },
        { status: 400 }
      )
    }
    
    // 验证头像 URL（如果提供）
    if (avatar_url) {
      // 允许相对路径（以 / 开头）或完整 URL
      if (!avatar_url.startsWith("/")) {
        try {
          new URL(avatar_url)
        } catch {
          return NextResponse.json(
            { error: "头像 URL 格式不正确" },
            { status: 400 }
          )
        }
      }
    }
    
    // 更新用户信息
    const updatedUser = await updateUser(currentUser.id, {
      username,
      avatar_url,
    })
    
    return NextResponse.json({
      ok: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error("更新用户信息失败:", error)
    return NextResponse.json(
      { error: "服务异常,请稍后重试" },
      { status: 500 }
    )
  }
}
