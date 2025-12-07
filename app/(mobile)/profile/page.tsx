"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserPublic } from "@/lib/db/user-service"
import { useDeviceData } from "@/lib/hooks/use-device-data"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([])
  const [newDeviceId, setNewDeviceId] = useState("")
  const [newDeviceName, setNewDeviceName] = useState("")
  const [notif, setNotif] = useState<{ alerts: boolean; status: boolean; ai: boolean; updates: boolean }>({ alerts: true, status: true, ai: false, updates: true })
  const [activity, setActivity] = useState<{ ts: number; text: string }[]>([])
  const { connectionStatus } = useDeviceData()

  

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (!mounted) return
        if (data?.authenticated && data?.user) {
          setUser(data.user as UserPublic)
        } else {
          router.replace("/login")
        }
      } catch {
        router.replace("/login")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [router])

  useEffect(() => {
    try {
      const ds = JSON.parse(localStorage.getItem("profile_devices") || "[]")
      const ns = JSON.parse(localStorage.getItem("profile_notifications") || "{}")
      const as = JSON.parse(localStorage.getItem("profile_activity") || "[]")
      if (Array.isArray(ds)) setDevices(ds)
      setNotif({ alerts: !!ns.alerts, status: !!ns.status, ai: !!ns.ai, updates: ns.updates !== false })
      if (Array.isArray(as)) setActivity(as)
    } catch {}
  }, [])

  const persistDevices = (list: { id: string; name: string }[]) => {
    setDevices(list)
    try { localStorage.setItem("profile_devices", JSON.stringify(list)) } catch {}
  }

  const persistNotif = (n: { alerts: boolean; status: boolean; ai: boolean; updates: boolean }) => {
    setNotif(n)
    try { localStorage.setItem("profile_notifications", JSON.stringify(n)) } catch {}
  }

  const addActivity = (text: string) => {
    const item = { ts: Date.now(), text }
    const next = [item, ...activity].slice(0, 20)
    setActivity(next)
    try { localStorage.setItem("profile_activity", JSON.stringify(next)) } catch {}
  }

  const addDevice = () => {
    const id = newDeviceId.trim()
    const name = newDeviceName.trim() || `设备 ${id || devices.length + 1}`
    if (!id) return
    const next = [...devices, { id, name }]
    persistDevices(next)
    setNewDeviceId("")
    setNewDeviceName("")
    addActivity(`绑定设备 ${name}(${id})`)
  }

  const removeDevice = (id: string) => {
    const target = devices.find(d => d.id === id)
    const next = devices.filter(d => d.id !== id)
    persistDevices(next)
    if (target) addActivity(`解除绑定 ${target.name}(${target.id})`)
  }

  if (loading) {
    return (
      <div className="min-h-screen w-screen h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#0B1121] text-foreground overflow-hidden font-sans transition-colors duration-500">
      <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[60%] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 blur-[100px] pointer-events-none" />
      <div className="relative z-10 h-dvh flex flex-col">
        <div className="px-6 pt-12 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{user.username}</h1>
                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{connectionStatus.connected ? '设备在线' : '设备离线'}</span>
                </div>
              </div>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
            <div className="relative size-16 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.svg" alt="logo" fill className="object-contain" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar space-y-4">
          <Card className="rounded-[2rem] border border-white/20 dark:border-white/5 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5">
              <CardTitle className="text-base font-bold">我的资料</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 border border-white/20">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-lg font-semibold">{user.username}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-white/40 dark:bg-black/40 backdrop-blur-sm">注册于 {new Date(user.created_at).toLocaleDateString("zh-CN")}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link href="/settings" className="inline-flex">
                  <Button variant="secondary" className="rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/70">编辑资料</Button>
                </Link>
                <Button variant="destructive" onClick={async () => { try { const r = await fetch("/api/auth/logout", { method: "POST" }); if (r.ok) router.replace("/login") } catch {} }} className="rounded-full backdrop-blur-sm bg-red-500/80 hover:bg-red-500/90">退出登录</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/20 dark:border-white/5 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5">
              <CardTitle className="text-base font-bold">设备绑定</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="device-id" className="text-xs">设备编号</Label>
                  <Input id="device-id" value={newDeviceId} onChange={e => setNewDeviceId(e.currentTarget.value)} placeholder="如 SN-001" className="mt-1 bg-white/60 dark:bg-white/10 border-white/20 backdrop-blur-sm" />
                </div>
                <div>
                  <Label htmlFor="device-name" className="text-xs">设备名称</Label>
                  <Input id="device-name" value={newDeviceName} onChange={e => setNewDeviceName(e.currentTarget.value)} placeholder="自定义名称" className="mt-1 bg-white/60 dark:bg-white/10 border-white/20 backdrop-blur-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addDevice} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6">绑定设备</Button>
              </div>
              <Separator className="my-2 bg-white/10 dark:bg-white/5" />
              <div className="grid grid-cols-1 gap-2">
                {devices.length === 0 ? (
                  <div className="text-sm text-muted-foreground">暂无已绑定设备</div>
                ) : (
                  devices.map(d => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-white/20 bg-white/50 dark:bg-white/10 backdrop-blur-sm p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 border-primary/20 backdrop-blur-sm">{d.id}</Badge>
                        <div className="text-sm font-medium">{d.name}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => removeDevice(d.id)} className="rounded-full bg-transparent border-white/20 hover:bg-white/20">解除绑定</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/20 dark:border-white/5 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5">
              <CardTitle className="text-base font-bold">通知设置</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={notif.alerts} onCheckedChange={v => { const n = { ...notif, alerts: !!v }; persistNotif(n); addActivity(`通知开关 重要告警 ${n.alerts ? "开启" : "关闭"}`) }} className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  重要告警
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={notif.status} onCheckedChange={v => { const n = { ...notif, status: !!v }; persistNotif(n); addActivity(`通知开关 设备状态 ${n.status ? "开启" : "关闭"}`) }} className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  设备状态
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={notif.ai} onCheckedChange={v => { const n = { ...notif, ai: !!v }; persistNotif(n); addActivity(`通知开关 AI 建议 ${n.ai ? "开启" : "关闭"}`) }} className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  AI 建议
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={notif.updates} onCheckedChange={v => { const n = { ...notif, updates: !!v }; persistNotif(n); addActivity(`通知开关 系统更新 ${n.updates ? "开启" : "关闭"}`) }} className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  系统更新
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/20 dark:border-white/5 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5">
              <CardTitle className="text-base font-bold">最近活动</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {activity.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无活动</div>
              ) : (
                <div className="space-y-2">
                  {activity.map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-white/20 bg-white/50 dark:bg-white/10 backdrop-blur-sm p-3">
                      <div className="text-sm">{a.text}</div>
                      <div className="text-xs text-muted-foreground">{new Date(a.ts).toLocaleString("zh-CN")}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
