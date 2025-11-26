"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { Thermometer, Droplets, Sun, Cloud, Leaf, Gauge } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MobileBackground } from "@/components/mobile-background"

interface UserPublic {
  id: number
  email: string
  username: string
  avatar_url: string | null
  created_at: number
}

function StatCard({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
  accent?: string
}) {
  return (
    <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${accent ?? "bg-primary/10"} backdrop-blur-sm`}>
              {icon}
            </div>
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-foreground mr-1">{value}</span>
            {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (mounted && data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch {}
      if (mounted) setLoadingUser(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const t = deviceData ? (deviceData.temperature / 10).toFixed(1) : "--"
  const h = deviceData ? (deviceData.humidity / 10).toFixed(1) : "--"
  const l = deviceData ? String(deviceData.light) : "--"
  const c = deviceData ? String(deviceData.co2) : "--"
  const st = deviceData ? (deviceData.earth_temp / 10).toFixed(1) : "--"
  const sw = deviceData ? (deviceData.earth_water / 10).toFixed(1) : "--"
  const sec = deviceData ? String(deviceData.earth_ec) : "--"

  return (
    <div className="min-h-screen w-screen bg-background text-foreground">
      <MobileBackground />
      <div className="relative z-10 grid grid-rows-[56px_1fr_64px] h-dvh">
        <div className="flex items-center gap-3 px-4 border-b border-white/5 bg-white/10 dark:bg-black/10 backdrop-blur-xl sticky top-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative size-8 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.svg" alt="logo" fill className="object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">STRAVISION</div>
              <div className="text-[10px] text-muted-foreground">莓界 · 移动看板</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {connectionStatus.connected ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 backdrop-blur-sm">
                在线
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 backdrop-blur-sm">
                离线
              </Badge>
            )}
            {!loadingUser && user ? (
              <UserAvatarMenu user={user} />
            ) : (
              <Link href="/login" className="text-sm text-muted-foreground">登录</Link>
            )}
          </div>
        </div>

        <div className="relative overflow-y-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Thermometer className="size-5 text-orange-500" />} label="温度" value={t} unit="°C" accent="bg-orange-500/10" />
            <StatCard icon={<Droplets className="size-5 text-blue-500" />} label="湿度" value={h} unit="%" accent="bg-blue-500/10" />
            <StatCard icon={<Sun className="size-5 text-yellow-500" />} label="光照" value={l} unit="lx" accent="bg-yellow-500/10" />
            <StatCard icon={<Cloud className="size-5 text-teal-500" />} label="CO₂" value={c} unit="ppm" accent="bg-teal-500/10" />
            <StatCard icon={<Gauge className="size-5 text-purple-500" />} label="土壤电导" value={sec} unit="μS/cm" accent="bg-purple-500/10" />
            <StatCard icon={<Leaf className="size-5 text-green-500" />} label="土壤水分" value={sw} unit="%" accent="bg-green-500/10" />
            <StatCard icon={<Thermometer className="size-5 text-rose-500" />} label="土壤温度" value={st} unit="°C" accent="bg-rose-500/10" />
          </div>

          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
            <CardHeader className="px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">设备状态</CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-normal backdrop-blur-sm">实时监控</Badge>
              </div>
            </CardHeader>
            <Separator className="mx-4 bg-white/10 dark:bg-white/5" />
            <CardContent className="px-4 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-white/5">
                  <div className="text-sm text-muted-foreground">水泵</div>
                  <div className="mt-1 text-sm font-medium">{deviceData?.relay5 === 1 ? "开" : "关"}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-white/5">
                  <div className="text-sm text-muted-foreground">风机</div>
                  <div className="mt-1 text-sm font-medium">{deviceData?.relay6 === 1 ? "开" : "关"}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-white/5">
                  <div className="text-sm text-muted-foreground">加热</div>
                  <div className="mt-1 text-sm font-medium">{deviceData?.relay7 === 1 ? "开" : "关"}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-white/5">
                  <div className="text-sm text-muted-foreground">白灯</div>
                  <div className="mt-1 text-sm font-medium">{deviceData?.relay8 === 1 ? "开" : "关"}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-white/5">
                  <div className="text-sm text-muted-foreground">LED R</div>
                  <div className="mt-1 text-sm font-medium">{deviceData ? deviceData.led1 : "--"}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-white/5">
                  <div className="text-sm text-muted-foreground">LED G</div>
                  <div className="mt-1 text-sm font-medium">{deviceData ? deviceData.led2 : "--"}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-white/5">
                  <div className="text-sm text-muted-foreground">LED B</div>
                  <div className="mt-1 text-sm font-medium">{deviceData ? deviceData.led3 : "--"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <MobileBottomNav position="sticky" />
      </div>
    </div>
  )
}
