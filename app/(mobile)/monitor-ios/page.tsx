"use client"

import { useEffect, useState, type ElementType } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import {
  LightBulbIcon,
  SpeakerWaveIcon,
  PlusIcon,
  Bars3Icon,
  FireIcon,
  BeakerIcon,
  BoltIcon,
  PlayIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  SunIcon,
  ArrowPathIcon,
  CloudIcon
} from "@heroicons/react/24/outline"
import type { UserPublic } from "@/lib/db/user-service"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { LiveStreamPlayer } from "@/components/live-stream-player"

// --- Components ---


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

function DeviceCard({
  title,
  subtitle,
  icon: Icon,
  isOn,
  onToggle,
  room,
  className = "",
  disabled = false
}: {
  title: string;
  subtitle: string;
  icon: ElementType;
  isOn: boolean;
  onToggle?: () => void;
  room: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`relative rounded-[2rem] p-5 shadow-sm flex flex-col justify-between h-[160px] transition-all duration-300 ${isOn
      ? 'bg-[#2c3e50] dark:bg-[#1e2936]'
      : 'bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/20 dark:border-white/5'
      } ${className}`}>
      <div className="flex justify-between items-start">
        <div className={`size-12 rounded-full flex items-center justify-center transition-colors duration-300 ${isOn
          ? 'bg-blue-500/20 text-blue-300'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
          <Icon className="size-7" />
        </div>
        <span className={`text-xs font-medium ${isOn ? 'text-blue-200/70' : 'text-slate-400'}`}>{room}</span>
      </div>

      <div>
        <h3 className={`text-base font-bold mb-1 ${isOn ? 'text-white' : 'text-foreground'}`}>{title}</h3>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium transition-colors duration-300 ${isOn ? 'text-blue-200/80' : 'text-slate-400'
            }`}>
            {subtitle}
          </span>

          {onToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
              disabled={disabled}
              className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute top-1 size-5 rounded-full transition-all duration-300 ${isOn ? 'left-[22px] bg-white' : 'left-1 bg-white'
                }`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MonitorIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { status: controlStatus, toggleRelay } = useDeviceControl()
  const { weatherData } = useWeatherContext()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [selectedRoom, setSelectedRoom] = useState("常用")

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch { }
    })()
  }, [])

  const handleRelayToggle = async (relayNum: number) => {
    if (!deviceData) return
    const currentState = (deviceData[`relay${relayNum}` as keyof typeof deviceData] as number) || 0
    await toggleRelay(relayNum, currentState)
  }

  // Count active devices
  const activeCount = [
    deviceData?.relay5,
    deviceData?.relay6,
    deviceData?.relay7,
    deviceData?.relay8
  ].filter(state => state === 1).length

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#0B1121] text-foreground overflow-hidden font-sans transition-colors duration-500">
      {/* Background blobs */}
      <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[60%] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 h-dvh flex flex-col">
        {/* Header */}
        <div className="px-6 pt-12 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{user?.username ? `${user.username}的大棚` : '我的大棚'}</h1>
                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    {connectionStatus.connected ? '设备在线' : '设备离线'}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative size-16 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.svg" alt="logo" fill className="object-contain" />
            </div>
          </div>

          {/* Weather Row */}
          <div className="flex justify-between items-center px-2" id="mobile-weather-row">
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
          <div className="relative bg-[#1a1a1a] dark:bg-[#0a0a0a] rounded-[2rem] overflow-hidden h-[200px] shadow-xl" id="mobile-video-player">
            <LiveStreamPlayer
              sources={[
                { src: "webrtc://223897.push.tlivecloud.com/live/stravision?txSecret=9f7996a9d4295232332d40ab868648c5&txTime=69297772" },
                { src: "http://yidiudiu1.top/live/stravision.m3u8" },
                { src: "http://yidiudiu1.top/live/stravision.flv" }
              ]}
              licenseUrl={process.env.NEXT_PUBLIC_TCPLAYER_LICENSE_URL}
              autoplay
              muted
              controls={false}
              className="absolute inset-0 w-full h-full"
            />

            {/* Live Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold">Live</span>
            </div>

            {/* Location Tag */}
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
              <span className="text-white text-xs font-medium">1号机</span>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button className="size-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
                <SpeakerXMarkIcon className="size-5 text-white" />
              </button>
              <button className="size-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
                <ArrowsPointingOutIcon className="size-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Room Tabs */}
        <div id="mobile-room-tabs">
            <RoomTabs selected={selectedRoom} onSelect={setSelectedRoom} />
        </div>

        {/* Execution Devices Section */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">执行设备 <span className="text-sm text-slate-400">({activeCount}台设备运行中)</span></h2>
            <button className="text-blue-600 text-sm font-medium">+</button>
          </div>
        </div>

        {/* Device Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar" id="mobile-device-grid">
          <div className="grid grid-cols-2 gap-4">

            {/* Relay 5: Water Pump */}
            <DeviceCard
              title="水泵"
              subtitle={deviceData?.relay5 === 1 ? "运行中" : "已停止"}
              icon={BeakerIcon}
              isOn={deviceData?.relay5 === 1}
              onToggle={() => handleRelayToggle(5)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 6: Fan */}
            <DeviceCard
              title="风扇"
              subtitle={deviceData?.relay6 === 1 ? "运行中" : "已停止"}
              icon={ArrowPathIcon}
              isOn={deviceData?.relay6 === 1}
              onToggle={() => handleRelayToggle(6)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 7: Grow Light */}
            <DeviceCard
              title="补光灯"
              subtitle={deviceData?.relay7 === 1 ? "ON" : "OFF"}
              icon={BoltIcon}
              isOn={deviceData?.relay7 === 1}
              onToggle={() => handleRelayToggle(7)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 8: White Light */}
            <DeviceCard
              title="白灯"
              subtitle={deviceData?.relay8 === 1 ? "ON" : "OFF"}
              icon={SunIcon}
              isOn={deviceData?.relay8 === 1}
              onToggle={() => handleRelayToggle(8)}
              room="控制室"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

          </div>
        </div>
      </div>
    </div>
  )
}
