"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { Wifi, WifiOff, Save, ArrowLeft, Upload, X } from "lucide-react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import type { UserPublic } from "@/lib/db/user-service"

export default function SettingsPage() {
  const router = useRouter()
  const { connectionStatus } = useDeviceData()

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Form state
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()

        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
          setUsername(data.user.username)
          setEmail(data.user.email)
          setAvatarUrl(data.user.avatar_url || "")
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("获取用户信息失败:", error)
        router.push("/login")
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchCurrentUser()
  }, [router])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "只支持 JPG、PNG、GIF 和 WebP 格式的图片" })
      return
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage({ type: "error", text: "文件大小不能超过 5MB" })
      return
    }

    setMessage(null)
    setIsUploading(true)

    try {
      // 创建预览
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // 上传文件
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setAvatarUrl(data.avatar_url)
        setMessage({ type: "success", text: "头像上传成功！请点击保存更改" })
      } else {
        setMessage({ type: "error", text: data.error || "上传失败，请重试" })
        setPreviewUrl(null)
      }
    } catch (error) {
      console.error("上传失败:", error)
      setMessage({ type: "error", text: "网络错误，请重试" })
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl("")
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setIsSaving(true)

    try {
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          avatar_url: avatarUrl.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentUser(data.user)
        setPreviewUrl(null)
        setMessage({ type: "success", text: "个人信息更新成功！" })
      } else {
        setMessage({ type: "error", text: data.error || "更新失败，请重试" })
      }
    } catch (error) {
      console.error("更新失败:", error)
      setMessage({ type: "error", text: "网络错误，请重试" })
    } finally {
      setIsSaving(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoadingUser) {
    return (
      <div className="min-h-screen w-screen h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  // Don't render page if no user (will redirect)
  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen w-screen h-screen bg-background dark:bg-[#0B1121] text-foreground transition-colors duration-500">
      {/* Background blobs for mobile/desktop style consistency */}
      <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[60%] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
        {/* Header */}
        <div className="relative flex items-center px-8 border-b border-border bg-background/50 dark:bg-[#111827]/50 backdrop-blur-xl">
          <div className="flex items-center gap-4 text-foreground">
            <Image src="/logo.svg" alt="logo" width={64} height={64} className="hidden md:block" />
            <div className="leading-tight hidden md:block">
              <div className="text-base font-bold tracking-wide">STRAVISION</div>
              <div className="text-xs text-muted-foreground">莓界 · 智慧农业平台</div>
            </div>
            
            {/* Mobile Title */}
            <div className="md:hidden text-lg font-bold">编辑资料</div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden md:block">
            <PageNavigation />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              {connectionStatus.connected ? (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
                  <Wifi className="size-3 mr-1" />
                  已连接
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
                  <WifiOff className="size-3 mr-1" />
                  {connectionStatus.error || '未连接'}
                </Badge>
              )}
              {connectionStatus.lastUpdate && (
                <span className="text-xs text-muted-foreground/60">
                  更新: {connectionStatus.lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
            <UserAvatarMenu user={currentUser} />
          </div>
        </div>

        {/* Content */}
        <div className="relative px-4 md:px-8 pb-8 pt-6 overflow-auto">
          <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6 text-muted-foreground hover:text-foreground hover:bg-accent/50"
            >
              <ArrowLeft className="mr-2 size-4" />
              返回
            </Button>

            <Card className="rounded-2xl bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/20 dark:border-white/5 text-foreground shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">个人设置</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  管理您的个人信息和账户设置
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Message */}
                  {message && (
                    <div
                      className={`p-4 rounded-lg ${message.type === "success"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                    >
                      {message.text}
                    </div>
                  )}

                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground/90">
                      邮箱地址
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted/50 dark:bg-black/20 border-border text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground/60">
                      邮箱地址不可修改
                    </p>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-foreground/90">
                      用户名 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="请输入用户名"
                      required
                      minLength={2}
                      maxLength={20}
                      className="bg-muted/50 dark:bg-black/20 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                    <p className="text-xs text-muted-foreground/60">
                      2-20个字符
                    </p>
                  </div>

                  {/* Avatar Upload */}
                  <div className="space-y-3">
                    <Label className="text-foreground/90">头像</Label>

                    {/* Avatar Preview */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 dark:bg-black/20 border border-border">
                      <div className="size-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 border-2 border-white/10">
                        {(previewUrl || avatarUrl) ? (
                          <img
                            src={previewUrl || avatarUrl}
                            alt="Avatar preview"
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        ) : (
                          <span className="text-white font-semibold text-2xl">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground/90 mb-1 font-medium">{username}</p>
                        <p className="text-xs text-muted-foreground mb-3">{email}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-foreground border border-border shadow-sm"
                          >
                            <Upload className="mr-2 size-3" />
                            {isUploading ? "上传中..." : "上传头像"}
                          </Button>
                          {avatarUrl && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleRemoveAvatar}
                              disabled={isUploading}
                              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 bg-transparent"
                            >
                              <X className="mr-2 size-3" />
                              移除
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <p className="text-xs text-muted-foreground/60">
                      支持 JPG、PNG、GIF、WebP 格式，最大 5MB
                    </p>
                  </div>

                  {/* Avatar URL (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl" className="text-foreground/90">
                      或使用头像 URL（可选）
                    </Label>
                    <Input
                      id="avatarUrl"
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="bg-muted/50 dark:bg-black/20 border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                    <p className="text-xs text-muted-foreground/60">
                      直接输入头像图片链接或相对路径
                    </p>
                  </div>

                  {/* Account Info */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground/90 mb-3">
                      账户信息
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">账户创建时间</span>
                        <span className="text-foreground/90">
                          {new Date(currentUser.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">用户 ID</span>
                        <span className="text-foreground/90 font-mono">#{currentUser.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4 sticky bottom-0 bg-background/80 dark:bg-[#0B1121]/80 backdrop-blur-md p-4 -mx-6 -mb-6 mt-6 border-t border-border md:static md:bg-transparent md:p-0 md:m-0 md:border-none">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 rounded-xl"
                    >
                      <Save className="mr-2 size-4" />
                      {isSaving ? "保存中..." : "保存更改"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 bg-transparent rounded-xl"
                    >
                      取消
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
