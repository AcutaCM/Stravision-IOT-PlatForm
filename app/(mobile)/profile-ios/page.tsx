"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserPublic } from "@/lib/db/user-service"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { 
  ChevronRight, 
  Smartphone, 
  Bell, 
  Activity, 
  Shield, 
  HelpCircle, 
  LogOut,
  Settings,
  Zap,
  Leaf,
  ThermometerSun,
  Camera,
  Info
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

  if (loading) return null
  if (!user) return null

  // Helper component for list items
  const ListItem = ({ icon: Icon, title, onClick, color = "text-blue-600 dark:text-white" }: { icon: any, title: string, onClick?: () => void, color?: string }) => (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className={`size-5 ${color}`} />
        <span className="text-[15px] font-medium text-foreground">{title}</span>
      </div>
      <ChevronRight className="size-5 text-slate-300 dark:text-slate-600" />
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B1121] pb-32 font-sans transition-colors duration-500">
      {/* Background blobs */}
      <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[60%] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 blur-[100px] pointer-events-none" />

      {/* Header Section */}
      <div className="relative z-10 px-5 pt-12 pb-6">
        <h1 className="text-xl font-bold text-foreground mb-4">我的账户</h1>
        
        {/* User Card */}
        <div className="bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-white/20 dark:border-white/5">
          <Avatar className="size-14 border-2 border-blue-100 dark:border-blue-900">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              {user.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{user.username}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
          <Link href="/settings">
            <Button variant="secondary" className="rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs h-8 px-4 text-foreground font-medium shadow-none border border-slate-200 dark:border-slate-700">
              编辑资料
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Toggles (Pills) */}
      <div className="relative z-10 px-5 mb-6">
        <h3 className="text-sm font-bold text-foreground mb-3">快捷通知</h3>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => persistNotif({ ...notif, alerts: !notif.alerts })}
            className={`flex-1 h-10 rounded-full text-xs font-bold transition-all px-4 whitespace-nowrap ${
              notif.alerts 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                : "bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl text-slate-600 dark:text-slate-400 border border-white/20 dark:border-white/5"
            }`}
          >
            重要告警
          </button>
          <button 
            onClick={() => persistNotif({ ...notif, status: !notif.status })}
            className={`flex-1 h-10 rounded-full text-xs font-bold transition-all px-4 whitespace-nowrap ${
              notif.status 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                : "bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl text-slate-600 dark:text-slate-400 border border-white/20 dark:border-white/5"
            }`}
          >
            设备状态
          </button>
          <button 
            onClick={() => persistNotif({ ...notif, ai: !notif.ai })}
            className={`flex-1 h-10 rounded-full text-xs font-bold transition-all px-4 whitespace-nowrap ${
              notif.ai 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                : "bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl text-slate-600 dark:text-slate-400 border border-white/20 dark:border-white/5"
            }`}
          >
            AI 建议
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="relative z-10 px-5 mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[24px] p-5 flex items-center justify-between shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
           <div className="relative z-10">
             <div className="flex items-center gap-2 mb-1">
               <Badge className="bg-white/20 hover:bg-white/20 border-none text-white backdrop-blur-md px-2 py-0.5 text-[10px]">
                 {connectionStatus.connected ? "已连接" : "离线"}
               </Badge>
             </div>
             <h3 className="text-lg font-bold">Stravision Pro</h3>
             <p className="text-xs text-white/80 mt-1">您正在享受完整的智能农业服务</p>
           </div>
           <div className="relative z-10 bg-white/20 p-2 rounded-full backdrop-blur-md">
             <Zap className="size-6 text-white" fill="currentColor" />
           </div>
        </div>
      </div>

      {/* Settings Group 1 */}
      <div className="relative z-10 px-5 mb-6">
        <div className="bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl rounded-[24px] overflow-hidden shadow-sm border border-white/20 dark:border-white/5">
          <Sheet>
            <SheetTrigger asChild>
              <div><ListItem icon={Smartphone} title="设备管理" /></div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[2rem]">
              <SheetHeader className="mb-6">
                <SheetTitle>设备管理</SheetTitle>
                <SheetDescription>添加或移除您的物联网设备</SheetDescription>
              </SheetHeader>
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-3">
                  <Label>绑定新设备</Label>
                  <div className="grid gap-3">
                    <Input value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} placeholder="设备编号 (如 SN-001)" className="bg-white dark:bg-black" />
                    <Input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="设备名称" className="bg-white dark:bg-black" />
                    <Button onClick={addDevice} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">确认绑定</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>已绑定设备</Label>
                  {devices.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed dark:border-slate-800">暂无设备</div>
                  ) : (
                    devices.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-white dark:bg-black border dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                             <Smartphone size={16} />
                           </div>
                           <div>
                             <div className="font-medium text-sm">{d.name}</div>
                             <div className="text-xs text-slate-400">{d.id}</div>
                           </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeDevice(d.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">移除</Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4" />
          
          <Sheet>
            <SheetTrigger asChild>
              <div><ListItem icon={Bell} title="通知设置" /></div>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2rem]">
              <SheetHeader className="mb-6">
                <SheetTitle>通知设置</SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                 {[
                   { id: "alerts", label: "重要告警", icon: Shield },
                   { id: "status", label: "设备状态", icon: Zap },
                   { id: "ai", label: "AI 建议", icon: Leaf },
                   { id: "updates", label: "系统更新", icon: Bell },
                 ].map(item => (
                   <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                     <div className="flex items-center gap-3">
                       <item.icon className="size-5 text-blue-600 dark:text-white" />
                       <span className="font-medium">{item.label}</span>
                     </div>
                     <Switch 
                        checked={notif[item.id as keyof typeof notif]} 
                        onCheckedChange={(v) => {
                          const next = { ...notif, [item.id]: v }
                          persistNotif(next)
                          addActivity(`更新通知设置: ${item.label} ${v ? "开启" : "关闭"}`)
                        }} 
                     />
                   </div>
                 ))}
              </div>
            </SheetContent>
          </Sheet>

          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4" />
          
          <Sheet>
            <SheetTrigger asChild>
              <div><ListItem icon={Activity} title="活动日志" /></div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-[2rem]">
              <SheetHeader className="mb-6">
                <SheetTitle>最近活动</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto h-full pb-20 space-y-4">
                {activity.length === 0 ? (
                  <div className="text-center text-slate-400 py-10">暂无活动记录</div>
                ) : (
                  activity.map((item, i) => (
                    <div key={i} className="flex gap-4">
                       <div className="flex flex-col items-center">
                         <div className="size-2 rounded-full bg-blue-500 mt-2" />
                         {i !== activity.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800 my-1" />}
                       </div>
                       <div className="pb-4">
                         <div className="text-sm font-medium text-foreground">{item.text}</div>
                         <div className="text-xs text-slate-400 mt-1">{new Date(item.ts).toLocaleString()}</div>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Settings Group 2 */}
      <div className="relative z-10 px-5 mb-6">
        <div className="bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl rounded-[24px] overflow-hidden shadow-sm border border-white/20 dark:border-white/5">
          <ListItem icon={Shield} title="隐私与安全" />
          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4" />
          
          <Dialog>
            <DialogTrigger asChild>
              <div><ListItem icon={Info} title="关于" /></div>
            </DialogTrigger>
            <DialogContent className="w-[85%] rounded-3xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border-white/20 dark:border-white/5">
              <DialogHeader>
                <DialogTitle className="text-center">关于</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <div className="size-24 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mb-4">
                  <Image src="/logo.svg" alt="Logo" width={48} height={48} className="size-12" />
                </div>
                <h3 className="text-xl font-bold mb-1">Stravision IoT</h3>
                <p className="text-sm text-slate-500 mb-8">Version 1.0.0</p>
                
                <Button 
                  className="w-full bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl h-12 shadow-none border border-slate-200 dark:border-slate-700"
                  onClick={() => addActivity("检查更新: 已是最新版本")}
                >
                  检查更新
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4" />

          <ListItem icon={HelpCircle} title="帮助与支持" />
          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4" />
          <div 
             onClick={async () => { try { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login") } catch {} }}
             className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="size-5 text-red-500" />
              <span className="text-[15px] font-medium text-red-500">退出登录</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 px-5 text-center">
        <p className="text-[10px] text-slate-400">Stravision IoT Platform v1.0.0</p>
      </div>

    </div>
  )
}
