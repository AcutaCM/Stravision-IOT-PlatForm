"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { LeafIcon, Thermometer, Droplets, Sun, Wind, Gauge, CloudSun } from "lucide-react"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import type { UserPublic } from "@/lib/db/user-service"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

import { MobileBackground } from "@/components/mobile-background"

function Stat({ icon, label, value, unit, bg, color }: { icon: React.ElementType; label: string; value: string; unit?: string; bg: string; color: string }) {
  const Icon = icon
  return (
    <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${bg} backdrop-blur-sm`}>
              <Icon className={`size-5 ${color}`} />
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

export default function MonitorIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { weatherData, loading: weatherLoading } = useWeatherContext()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [tempHistory, setTempHistory] = useState<number[]>([])
  const [ecHistory, setEcHistory] = useState<number[]>([])
  

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
    return () => { mounted = false }
  }, [])

  

  const t = deviceData ? (deviceData.temperature / 10).toFixed(1) : "--"
  const h = deviceData ? (deviceData.humidity / 10).toFixed(1) : "--"
  const l = deviceData ? String(deviceData.light) : "--"
  const c = deviceData ? String(deviceData.co2) : "--"
  const st = deviceData ? (deviceData.earth_temp / 10).toFixed(1) : "--"
  const sw = deviceData ? (deviceData.earth_water / 10).toFixed(1) : "--"

  useEffect(() => {
    if (deviceData?.temperature !== undefined) {
      const v = deviceData.temperature / 10
      setTimeout(() => {
        setTempHistory(prev => [...prev, v].slice(-20))
      }, 0)
    }
  }, [deviceData?.temperature])

  useEffect(() => {
    if (deviceData?.earth_ec !== undefined) {
      const v = deviceData.earth_ec
      setTimeout(() => {
        setEcHistory(prev => [...prev, v].slice(-20))
      }, 0)
    }
  }, [deviceData?.earth_ec])

  return (
    <div className="min-h-screen w-screen bg-background text-foreground overflow-hidden">
      <MobileBackground />
      <div className="relative z-10 grid grid-rows-[56px_1fr_64px] h-dvh">
        <div className="flex items-center gap-3 px-4 bg-white/10 dark:bg-black/10 backdrop-blur-xl border-b border-white/5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative size-10 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.svg" alt="logo" fill className="object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">STRAVISION</div>
              <div className="text-[10px] text-muted-foreground">莓界 · 移动监测</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {connectionStatus.connected ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 backdrop-blur-sm">在线</Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 backdrop-blur-sm">离线</Badge>
            )}
            {!loadingUser && user ? <UserAvatarMenu user={user} /> : <Link href="/login" className="text-sm text-muted-foreground">登录</Link>}
          </div>
        </div>

        <div className="relative overflow-y-auto px-4 py-4 space-y-4">
          <Card className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-400/20 overflow-hidden backdrop-blur-md shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {weatherLoading ? (
                  <div className="text-blue-900/70">加载中...</div>
                ) : weatherData?.current ? (
                  <>
                    <CloudSun className="size-6 text-blue-600" />
                    <div>
                      <div className="text-xl font-bold text-blue-950 dark:text-blue-100">{Math.round(weatherData.current.temp_c)}°C</div>
                      <div className="text-xs text-blue-800/70 dark:text-blue-200/70">{weatherData.current.condition.text}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <CloudSun className="size-6 text-muted-foreground" />
                    <div className="text-xl font-bold">--°C</div>
                  </>
                )}
              </div>
              {weatherData?.location && (
                <div className="text-right">
                  <div className="text-sm font-medium">{weatherData.location.name === 'Ningbo' ? '宁波' : weatherData.location.name}</div>
                  <div className="text-xs text-muted-foreground">{weatherData.location.region === 'Zhejiang' ? '浙江' : weatherData.location.region}</div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] overflow-hidden">
            <CardHeader className="px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <LeafIcon className="size-4 text-primary" />
                  草莓栽培监测
                </CardTitle>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 backdrop-blur-sm">实时</Badge>
              </div>
            </CardHeader>
            <Separator className="mx-4 bg-white/10" />
            <CardContent className="px-4 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Thermometer} label="温度" value={t} unit="°C" bg="bg-orange-500/10" color="text-orange-500" />
                <Stat icon={Thermometer} label="土温" value={st} unit="°C" bg="bg-red-500/10" color="text-red-500" />
                <Stat icon={Sun} label="光照" value={l} unit="lux" bg="bg-yellow-500/10" color="text-yellow-500" />
                <Stat icon={Wind} label="CO₂" value={c} unit="ppm" bg="bg-cyan-500/10" color="text-cyan-500" />
                <Stat icon={Droplets} label="湿度" value={h} unit="%" bg="bg-blue-500/10" color="text-blue-500" />
                <Stat icon={Gauge} label="土壤电导" value={deviceData ? String(deviceData.earth_ec) : "--"} unit="μS/cm" bg="bg-purple-500/10" color="text-purple-500" />
                <Stat icon={Droplets} label="土壤水分" value={sw} unit="%" bg="bg-purple-500/10" color="text-purple-500" />
              </div>

              <Card className="rounded-2xl bg-secondary/20 border-white/5 p-4 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">温度趋势</div>
                      <div className="text-xs text-muted-foreground">{t}°C</div>
                    </div>
                    <div className="h-[60px] w-full">
                      <svg viewBox="0 0 360 60" className="w-full h-full">
                        {tempHistory.length > 1 ? (() => {
                          const maxV = Math.max(...tempHistory, 1)
                          const minV = Math.min(...tempHistory, 0)
                          const range = maxV - minV || 1
                          const pts = tempHistory.map((v, i) => {
                            const x = (i / (tempHistory.length - 1)) * 360
                            const y = 50 - ((v - minV) / range) * 40
                            return `${x},${y}`
                          }).join(' ')
                          return <path d={`M${pts.replace(/ /g, ' L')}`} fill="none" stroke="var(--primary)" strokeWidth="2" />
                        })() : <text x="180" y="30" textAnchor="middle" className="text-muted-foreground text-xs">等待数据...</text>}
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">EC 趋势</div>
                      <div className="text-xs text-muted-foreground">{deviceData ? deviceData.earth_ec : "--"} μS/cm</div>
                    </div>
                    <div className="h-[60px] w-full">
                      <svg viewBox="0 0 360 60" className="w-full h-full">
                        {ecHistory.length > 1 ? (() => {
                          const maxV = Math.max(...ecHistory, 1)
                          const minV = Math.min(...ecHistory, 0)
                          const range = maxV - minV || 1
                          const pts = ecHistory.map((v, i) => {
                            const x = (i / (ecHistory.length - 1)) * 360
                            const y = 50 - ((v - minV) / range) * 40
                            return `${x},${y}`
                          }).join(' ')
                          return <path d={`M${pts.replace(/ /g, ' L')}`} fill="none" stroke="var(--primary)" strokeWidth="2" />
                        })() : <text x="180" y="30" textAnchor="middle" className="text-muted-foreground text-xs">等待数据...</text>}
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>
            </CardContent>
          </Card>
        </div>

        <MobileBottomNav position="sticky" />
      </div>
    </div>
  )
}
