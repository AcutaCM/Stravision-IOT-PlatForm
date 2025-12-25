"use client"

import { useEffect, useRef, useState } from "react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { toast } from "sonner"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AlertType = 'temp_high' | 'humidity_high' | 'humidity_low' | 'co2_high' | 'light_low'

interface AlertConfig {
  type: AlertType
  title: string
  description: string
  actionLabel: string
  action: () => Promise<boolean>
}

// Custom Toast Component
function AlertToast({ 
  id, 
  config, 
  onIgnore 
}: { 
  id: string | number
  config: AlertConfig
  onIgnore: (duration: number) => void 
}) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      const success = await config.action()
      if (success) {
        toast.success("已自动调整设备")
        toast.dismiss(id)
      } else {
        toast.error("设备调整失败")
      }
    } catch {
      toast.error("设备调整失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full bg-white dark:bg-slate-950 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-amber-600 dark:text-amber-500 flex items-center gap-2">
            ⚠️ {config.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {config.description}
          </p>
        </div>
        <button 
          onClick={() => toast.dismiss(id)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Button 
          size="sm" 
          onClick={handleAction} 
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white border-none h-8 px-3"
        >
          {loading ? "执行中..." : config.actionLabel}
        </Button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-3 gap-2">
              <Clock className="h-3.5 w-3.5" />
              忽略...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { onIgnore(60 * 60 * 1000); toast.dismiss(id); }}>
              忽略 1 小时
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onIgnore(4 * 60 * 60 * 1000); toast.dismiss(id); }}>
              忽略 4 小时
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onIgnore(24 * 60 * 60 * 1000); toast.dismiss(id); }}>
              忽略 24 小时
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onIgnore(Infinity); toast.dismiss(id); }}>
              不再提醒 (本次会话)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function EnvironmentAlert() {
  const { deviceData } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const pathname = usePathname()
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  
  // Store the timestamp when the alert can be shown again (expiry time)
  const alertExpirationsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) return
        const data = await res.json()
        if (data?.authenticated && data?.user?.notification_settings?.alerts !== undefined) {
          setAlertsEnabled(!!data.user.notification_settings.alerts)
        }
      } catch {
      }
    }

    if (pathname === "/" || pathname === "/login" || pathname === "/register") return
    fetchSettings()
  }, [pathname])

  useEffect(() => {
    // Don't show alerts on landing page, auth pages or if no data or if alerts disabled
    if (pathname === '/' || pathname === '/login' || pathname === '/register' || !deviceData || !alertsEnabled) return

    // Helper to check and trigger
    const checkAndTrigger = (condition: boolean, config: AlertConfig) => {
      const now = Date.now()
      const expiryTime = alertExpirationsRef.current[config.type] || 0

      // Only show alert if condition is met AND current time is past the expiry time
      if (condition && now > expiryTime) {
        // Set a default short cooldown (e.g. 1 min) just to prevent double-firing immediately
        // Real cooldown is set by user interaction
        alertExpirationsRef.current[config.type] = now + 60 * 1000
        
        toast.custom((id) => (
          <AlertToast 
            id={id} 
            config={config} 
            onIgnore={(duration) => {
              alertExpirationsRef.current[config.type] = Date.now() + duration
              toast.info(`已忽略 ${config.title}`, {
                description: duration === Infinity ? "本次会话不再提醒" : `将在 ${(duration / 3600000).toFixed(1)} 小时后恢复提醒`
              })
            }} 
          />
        ), {
          duration: Infinity,
        })
        return true
      }
      return false
    }

    // Temperature High (> 30) -> Turn on Fan (Relay 6)
    // Only alert if fan is currently OFF
    if (checkAndTrigger(
      deviceData.temperature > 30 && deviceData.relay6 === 0,
      {
        type: 'temp_high',
        title: '高温预警',
        description: `当前温度 (${deviceData.temperature}°C) 过高。是否开启通风风扇进行降温？`,
        actionLabel: '开启风扇',
        action: () => toggleRelay(6, 0)
      }
    )) return

    // Humidity High (> 80) -> Turn on Fan (Relay 6)
    if (checkAndTrigger(
      deviceData.humidity > 80 && deviceData.relay6 === 0,
      {
        type: 'humidity_high',
        title: '高湿预警',
        description: `当前湿度 (${deviceData.humidity}%) 过高。是否开启通风风扇进行除湿？`,
        actionLabel: '开启风扇',
        action: () => toggleRelay(6, 0)
      }
    )) return

    // CO2 High (> 1000) -> Turn on Fan (Relay 6)
    if (checkAndTrigger(
      deviceData.co2 > 1000 && deviceData.relay6 === 0,
      {
        type: 'co2_high',
        title: 'CO2浓度预警',
        description: `当前CO2浓度 (${deviceData.co2}ppm) 过高。是否开启通风风扇？`,
        actionLabel: '开启风扇',
        action: () => toggleRelay(6, 0)
      }
    )) return

    // Light Low (< 1000) -> Turn on Grow Light (Relay 7)
    // Only check if light is OFF
    if (checkAndTrigger(
      deviceData.light < 1000 && deviceData.relay7 === 0,
      {
        type: 'light_low',
        title: '光照不足预警',
        description: `当前光照 (${deviceData.light} Lux) 不足。是否开启补光灯？`,
        actionLabel: '开启补光灯',
        action: () => toggleRelay(7, 0)
      }
    )) return

  }, [deviceData, toggleRelay])

  return null
}
