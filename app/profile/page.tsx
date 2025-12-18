"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Smartphone, 
  Activity, 
  Bell, 
  Zap,
  LayoutDashboard,
  Calendar,
  Mail,
  Edit
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import type { UserPublic } from "@/lib/db/user-service"
import { useDeviceData } from "@/lib/hooks/use-device-data"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const { connectionStatus } = useDeviceData()
  
  // Local state for features (matching mobile behavior)
  const [notif, setNotif] = useState<{ alerts: boolean; status: boolean; ai: boolean; updates: boolean }>({ 
    alerts: true, status: true, ai: false, updates: true 
  })
  const [activityLog, setActivityLog] = useState<{ ts: number; text: string }[]>([])
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    // Fetch user
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.authenticated && data?.user) {
          setUser(data.user)
        } else {
          router.replace("/login")
        }
      } catch {
        router.replace("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchUser()

    // Load local storage data
    try {
      const ns = JSON.parse(localStorage.getItem("profile_notifications") || "{}")
      const as = JSON.parse(localStorage.getItem("profile_activity") || "[]")
      const ds = JSON.parse(localStorage.getItem("profile_devices") || "[]")
      
      setNotif(prev => ({ ...prev, ...ns }))
      if (Array.isArray(as)) setActivityLog(as)
      if (Array.isArray(ds)) setDevices(ds)
    } catch {}
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  const persistNotif = (key: keyof typeof notif, value: boolean) => {
    const next = { ...notif, [key]: value }
    setNotif(next)
    try { 
      localStorage.setItem("profile_notifications", JSON.stringify(next))
      addActivity(`更新通知设置: ${key} ${value ? "开启" : "关闭"}`)
    } catch {}
  }

  const addActivity = (text: string) => {
    const item = { ts: Date.now(), text }
    const next = [item, ...activityLog].slice(0, 20)
    setActivityLog(next)
    try { localStorage.setItem("profile_activity", JSON.stringify(next)) } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">加载用户信息...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex h-16 items-center px-8 justify-between">
          <div className="flex items-center gap-6">
            <Link href="/monitor" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative size-8">
                <Image src="/logo.svg" alt="logo" fill className="object-contain" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden md:block">STRAVISION</span>
            </Link>
            <PageNavigation />
          </div>
          <UserAvatarMenu user={user} />
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Profile Card */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <div className="h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative">
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#444cf7_1px,transparent_1px)] [background-size:16px_16px]" />
              </div>
              <CardContent className="pt-0 relative">
                <div className="flex justify-center -mt-16 mb-4">
                  <Avatar className="size-32 border-4 border-background shadow-xl">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground">{user.username}</h2>
                  <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
                    <Mail size={14} /> {user.email}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Shield size={16} /> 角色
                    </span>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">管理员</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar size={16} /> 加入时间
                    </span>
                    <span className="text-sm font-medium">
                      {format(new Date(user.created_at), "yyyy-MM-dd")}
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/settings">
                      <Edit className="mr-2 size-4" /> 编辑
                    </Link>
                  </Button>
                  <Button variant="destructive" className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" /> 登出
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" /> 系统概览
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-foreground">{devices.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">关联设备</div>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-500">{connectionStatus.connected ? "在线" : "离线"}</div>
                  <div className="text-xs text-muted-foreground mt-1">当前状态</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content: Tabs */}
          <div className="md:col-span-8 lg:col-span-9">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-muted/50 p-1 border border-border/50">
                <TabsTrigger value="overview" className="px-6">概览</TabsTrigger>
                <TabsTrigger value="activity" className="px-6">活动日志</TabsTrigger>
                <TabsTrigger value="notifications" className="px-6">通知设置</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Device Status */}
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="text-purple-500" /> 设备管理
                      </CardTitle>
                      <CardDescription>当前管理的物联网设备</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {devices.length > 0 ? (
                        <div className="space-y-3">
                          {devices.map((dev, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                  <Zap size={16} />
                                </div>
                                <span className="font-medium">{dev.name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">ID: {dev.id}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>暂无关联设备</p>
                          <Button variant="link" className="text-primary mt-2">前往监控页添加</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* System Status */}
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="text-green-500" /> 安全中心
                      </CardTitle>
                      <CardDescription>账户与系统安全状态</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">密码强度</span>
                        <div className="flex gap-1">
                          <div className="w-8 h-2 rounded-full bg-green-500" />
                          <div className="w-8 h-2 rounded-full bg-green-500" />
                          <div className="w-8 h-2 rounded-full bg-green-500" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">MFA 验证</span>
                        <Badge variant="secondary" className="text-muted-foreground">未开启</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">上次登录</span>
                        <span className="text-sm text-muted-foreground">刚刚</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="text-orange-500" /> 最近活动
                    </CardTitle>
                    <CardDescription>过去 30 天内的操作记录</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 relative pl-2">
                      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/60" />
                      {activityLog.length > 0 ? (
                        activityLog.map((log, i) => (
                          <div key={i} className="relative flex gap-4 items-start group">
                            <div className="z-10 size-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors">
                              <div className="size-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary transition-colors" />
                            </div>
                            <div className="pt-2 pb-1">
                              <p className="font-medium text-sm text-foreground">{log.text}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(log.ts), "yyyy年MM月dd日 HH:mm:ss", { locale: zhCN })}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">暂无活动记录</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="text-yellow-500" /> 通知偏好
                    </CardTitle>
                    <CardDescription>管理您希望接收的消息类型</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">重要告警</Label>
                        <p className="text-sm text-muted-foreground">接收设备离线、异常状态等紧急通知</p>
                      </div>
                      <Switch 
                        checked={notif.alerts}
                        onCheckedChange={(v) => persistNotif("alerts", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">设备状态</Label>
                        <p className="text-sm text-muted-foreground">接收设备开关、参数调整等操作反馈</p>
                      </div>
                      <Switch 
                        checked={notif.status}
                        onCheckedChange={(v) => persistNotif("status", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">AI 建议</Label>
                        <p className="text-sm text-muted-foreground">接收来自 AI 助手的种植优化建议</p>
                      </div>
                      <Switch 
                        checked={notif.ai}
                        onCheckedChange={(v) => persistNotif("ai", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">系统更新</Label>
                        <p className="text-sm text-muted-foreground">接收平台功能更新与维护通知</p>
                      </div>
                      <Switch 
                        checked={notif.updates}
                        onCheckedChange={(v) => persistNotif("updates", v)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
