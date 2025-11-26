"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { Droplet, Lightbulb, Sun, Fan, Thermometer, Wind } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import type { UserPublic } from "@/lib/db/user-service"
import { MobileBackground } from "@/components/mobile-background"

function Toggle({ checked = false, onChange, disabled = false }: { checked?: boolean; onChange?: (checked: boolean) => void; disabled?: boolean }) {
  const handleToggle = () => { if (!disabled) onChange?.(!checked) }
  return (
    <button type="button" onClick={handleToggle} disabled={disabled} className={`relative w-16 h-9 rounded-full transition-all duration-300 shadow-lg ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${checked ? "bg-primary" : "bg-muted"}`}>
      <span className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-md" style={{ left: checked ? "calc(100% - 32px)" : "4px", transition: "left 0.2s ease" }} />
    </button>
  )
}

function DeviceCard({ title, icon, gradient, checked = false, onChange, disabled = false }: { title: string; icon: React.ReactNode; gradient: string; checked?: boolean; onChange?: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <Card className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
      <div className="absolute inset-0 opacity-40" style={{ background: gradient }} />
      <CardContent className="relative z-10 p-5 flex items-center justify-between min-h-[100px]">
        <div className="flex items-center gap-3">
          <div className="opacity-80">{icon}</div>
          <div className="text-foreground font-semibold text-sm">{title}</div>
        </div>
        <Toggle checked={checked} onChange={onChange} disabled={disabled} />
      </CardContent>
    </Card>
  )
}

function SliderRow({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className="text-sm font-bold text-foreground">{value}</span>
      </div>
      <input type="range" min={0} max={255} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow" style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${(value / 255) * 100}%, var(--muted) ${(value / 255) * 100}%, var(--muted) 100%)` }} />
    </div>
  )
}

export default function DeviceControlIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { status: controlStatus, toggleRelay, setLEDs } = useDeviceControl()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [localR, setLocalR] = useState<number | null>(null)
  const [localG, setLocalG] = useState<number | null>(null)
  const [localB, setLocalB] = useState<number | null>(null)
  

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

  const r = (localR ?? deviceData?.led1 ?? 0)
  const g = (localG ?? deviceData?.led2 ?? 0)
  const b = (localB ?? deviceData?.led3 ?? 0)

  const handleRelayToggle = async (relayNum: number) => {
    if (!deviceData) return
    const currentState = (deviceData[`relay${relayNum}` as keyof typeof deviceData] as number) || 0
    await toggleRelay(relayNum, currentState)
  }

  const handleLEDUpdate = async () => {
    await setLEDs(r, g, b, 0)
  }

  return (
    <div className="min-h-screen w-screen bg-background text-foreground overflow-hidden">
      <MobileBackground />
      <div className="relative z-10 grid grid-rows-[56px_1fr_64px] h-dvh">
        <div className="flex items-center gap-3 px-4 border-b border-white/5 bg-white/10 dark:bg-black/10 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative size-10 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.svg" alt="logo" fill className="object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">STRAVISION</div>
              <div className="text-[10px] text-muted-foreground">莓界 · 移动设备控制</div>
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

        <div className="relative overflow-y-auto px-4 py-4 space-y-4 pb-32">
          <div className="grid grid-cols-2 gap-4 auto-rows-[minmax(100px,auto)]">
            <DeviceCard title="水泵 (Relay 5)" icon={<Droplet className="size-10" strokeWidth={1.5} />} gradient="radial-gradient(circle at 30% 30%, rgba(13, 94, 248, 0.4) 0%, transparent 70%)" checked={deviceData?.relay5 === 1} onChange={() => handleRelayToggle(5)} disabled={controlStatus.loading || !connectionStatus.connected} />
            <DeviceCard title="风扇 (Relay 6)" icon={<Fan className="size-10" strokeWidth={1.5} />} gradient="radial-gradient(circle at 30% 30%, rgba(96, 165, 250, 0.4) 0%, transparent 70%)" checked={deviceData?.relay6 === 1} onChange={() => handleRelayToggle(6)} disabled={controlStatus.loading || !connectionStatus.connected} />
            <DeviceCard title="补光灯 (Relay 7)" icon={<Lightbulb className="size-10" strokeWidth={1.5} />} gradient="radial-gradient(circle at 30% 30%, rgba(245, 183, 0, 0.4) 0%, transparent 70%)" checked={deviceData?.relay7 === 1} onChange={() => handleRelayToggle(7)} disabled={controlStatus.loading || !connectionStatus.connected} />
            <DeviceCard title="白灯 (Relay 8)" icon={<Sun className="size-10" strokeWidth={1.5} />} gradient="radial-gradient(circle at 30% 30%, rgba(138, 124, 243, 0.4) 0%, transparent 70%)" checked={deviceData?.relay8 === 1} onChange={() => handleRelayToggle(8)} disabled={controlStatus.loading || !connectionStatus.connected} />
          </div>

          <Card className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
            <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 30% 30%, rgba(76, 128, 255, 0.4) 0%, transparent 70%)" }} />
            <CardContent className="relative z-10 p-5 space-y-4">
              <Badge variant="outline" className="bg-background/40 backdrop-blur-sm mb-2">RGB 控制 (LED 1-3)</Badge>
              <div className="w-full h-20 rounded-xl border border-border shadow-inner transition-all duration-300" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})`, boxShadow: `0 0 24px rgba(${r}, ${g}, ${b}, 0.4)` }} />
              <div className="space-y-3">
                <SliderRow label="红色 (LED 1)" value={r} onChange={setLocalR} color="#ef4444" />
                <SliderRow label="绿色 (LED 2)" value={g} onChange={setLocalG} color="#22c55e" />
                <SliderRow label="蓝色 (LED 3)" value={b} onChange={setLocalB} color="#3b82f6" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleLEDUpdate} disabled={controlStatus.loading || !connectionStatus.connected} className="px-6">{controlStatus.loading ? "发送中..." : "更新 LED 亮度"}</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
              <CardContent className="p-5 flex items-center gap-3">
                <Thermometer className="size-10" strokeWidth={1.5} />
                <div className="space-y-1">
                  <div className="text-sm font-semibold">温湿度传感器</div>
                  <div className="text-xs text-muted-foreground">只读</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
              <CardContent className="p-5 flex items-center gap-3">
                <Wind className="size-10" strokeWidth={1.5} />
                <div className="space-y-1">
                  <div className="text-sm font-semibold">CO₂ 传感器</div>
                  <div className="text-xs text-muted-foreground">只读</div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Quick actions removed as requested */}
        </div>

        <MobileBottomNav position="sticky" />
      </div>
    </div>
  )
}
