"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserPublic } from "@/lib/db/user-service"
import { User, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface UserAvatarMenuProps {
  user: UserPublic
}

/**
 * 获取用户名首字母作为头像 fallback
 */
function getInitials(username: string): string {
  if (!username) return "U"

  // 如果是中文名,取第一个字
  if (/[\u4e00-\u9fa5]/.test(username)) {
    return username.charAt(0)
  }

  // 如果是英文名,取首字母
  const parts = username.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
  }

  return username.charAt(0).toUpperCase()
}

export function UserAvatarMenu({ user }: UserAvatarMenuProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        // 重定向到登录页面
        router.push("/login")
      } else {
        console.error("登出失败")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("登出请求失败:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
          <Avatar className="size-9 border-2 border-white/20 cursor-pointer hover:border-white/40 transition-colors">
            <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {getInitials(user.username)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-foreground/90 font-medium hidden sm:inline">
            {user.username}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
          onClick={() => router.push("/settings")}
        >
          <User className="mr-2 size-4" />
          <span>个人设置</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-red-500 focus:text-red-500"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 size-4" />
          <span>{isLoggingOut ? "登出中..." : "登出"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
