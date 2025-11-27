"use client"

import { useEffect, useState, type ElementType } from "react"
import Image from "next/image"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MobileBackground } from "@/components/mobile-background"
import { LiveStreamPlayer } from "@/components/live-stream-player"
import type { UserPublic } from "@/lib/db/user-service"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { FireIcon, BeakerIcon, BoltIcon, SunIcon, CloudIcon, Bars3Icon } from "@heroicons/react/24/outline"

 

function RoomTabs({ selected, onSelect }: { selected: string; onSelect: (room: string) => void }) {
  const rooms = ["常用", "种植区A", "种植区B", "控制室"]
  return (
    <div className="flex items-center gap-3 overflow-x-auto px-4 py-2 no-scrollbar">
      {rooms.map((room) => {
        const isSelected = selected === room
        return (
          <button
            key={room}
            onClick={() => onSelect(room)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${isSelected
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
              : "bg-white/60 dark:bg-white/5 text-foreground/70 hover:bg-white/80"
              }`}
          >
            {room}
          </button>
        )
      })}
      <button className="p-2 rounded-full bg-white/60 dark:bg-white/5 text-foreground/70">
        <Bars3Icon className="size-5" />
      </button>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, unit, color, bg }: { icon: ElementType; label: string; value: string | number; unit?: string; color: string; bg: string }) {
  return (
    <div className={`relative rounded-[2rem] p-5 shadow-sm flex flex-col justify-between h-[120px] transition-all duration-300 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/20 dark:border-white/5`}>
      <div className="flex items-start justify-between">
        <div className={`size-10 rounded-full flex items-center justify-center ${bg} text-foreground/80`}>
          <Icon className={`size-5 ${color}`} />
        </div>

        
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-foreground">
          {value}{unit ? <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span> : null}
        </div>
      </div>
    </div>
  )
}

export default function DashboardIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { weatherData } = useWeatherContext()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [selectedRoom, setSelectedRoom] = useState("常用")

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch {}
    })()
  }, [])

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#0B1121] text-foreground overflow-hidden font-sans transition-colors duration-500">
      <MobileBackground />
      <div className="relative z-10 h-dvh flex flex-col">
        <div className="px-6 pt-12 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{user?.username ? `${user.username}的大棚` : '我的大棚'}</h1>
                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{connectionStatus.connected ? '设备在线' : '设备离线'}</span>
                </div>
              </div>
            </div>
            <div className="relative size-16 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.svg" alt="logo" fill className="object-contain" />
            </div>
          </div>
          <div className="flex justify-between items-center px-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-foreground">
                <FireIcon className="size-5 text-blue-500" />
                <span className="text-2xl font-bold">{weatherData?.current?.temp_c ? Math.round(weatherData.current.temp_c) : 24}°C</span>
              </div>
              <span className="text-xs text-slate-400 mt-1">{weatherData?.location?.name || '上城区'}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-foreground">
                <BeakerIcon className="size-5 text-blue-500" />
                <span className="text-2xl font-bold">{weatherData?.current?.humidity || 67}%</span>
              </div>
              <span className="text-xs text-slate-400 mt-1">湿度</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-foreground">
                <BoltIcon className="size-5 text-blue-500" />
                <span className="text-2xl font-bold">良好</span>
              </div>
              <span className="text-xs text-slate-400 mt-1">PM2.5</span>
            </div>
          </div>
        </div>
        <div className="px-4 mb-4">
          <div className="relative bg-[#1a1a1a] dark:bg-[#0a0a0a] rounded-[2rem] overflow-hidden h-[200px] shadow-xl">
            <LiveStreamPlayer
              sources={[
                { src: "webrtc://yidiudiu1.top/live/stravision" },
                { src: "http://yidiudiu1.top/live/stravision.m3u8" },
                { src: "http://yidiudiu1.top/live/stravision.flv" }
              ]}
              licenseUrl={process.env.NEXT_PUBLIC_TCPLAYER_LICENSE_URL}
              autoplay
              muted
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold">Live</span>
            </div>
          </div>
        </div>
        <RoomTabs selected={selectedRoom} onSelect={setSelectedRoom} />
        <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={FireIcon} label="温度" value={deviceData ? (deviceData.temperature / 10).toFixed(1) : '--'} unit="°C" color="text-orange-500" bg="bg-orange-500/10" />
            <StatCard icon={BeakerIcon} label="湿度" value={deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'} unit="%" color="text-blue-500" bg="bg-blue-500/10" />
            <StatCard icon={SunIcon} label="光照" value={deviceData ? deviceData.light : '--'} unit="lux" color="text-yellow-500" bg="bg-yellow-500/10" />
            <StatCard icon={CloudIcon} label="CO₂" value={deviceData ? deviceData.co2 : '--'} unit="ppm" color="text-teal-500" bg="bg-teal-500/10" />
            <StatCard icon={BoltIcon} label="土壤电导" value={deviceData ? deviceData.earth_ec : '--'} unit="μS/cm" color="text-purple-500" bg="bg-purple-500/10" />
            <StatCard icon={BeakerIcon} label="土壤水分" value={deviceData ? (deviceData.earth_water / 10).toFixed(1) : '--'} unit="%" color="text-green-500" bg="bg-green-500/10" />
            <StatCard icon={FireIcon} label="土壤温度" value={deviceData ? (deviceData.earth_temp / 10).toFixed(1) : '--'} unit="°C" color="text-rose-500" bg="bg-rose-500/10" />
          </div>
        </div>
        <MobileBottomNav position="sticky" />
      </div>
    </div>
  )
}
