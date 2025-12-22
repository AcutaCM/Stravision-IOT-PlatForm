"use client"

import { useEffect, useRef, useState } from "react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { toast } from "sonner"
import { usePathname } from "next/navigation"

type AlertType = 'temp_high' | 'humidity_high' | 'humidity_low' | 'co2_high' | 'light_low'

interface AlertConfig {
  type: AlertType
  title: string
  description: string
  actionLabel: string
  action: () => Promise<boolean>
}

export function EnvironmentAlert() {
  const { deviceData } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const pathname = usePathname()
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  
  // Cooldown to prevent spamming (5 minutes)
  const lastAlertTimeRef = useRef<number>(0)
  const COOLDOWN = 5 * 60 * 1000

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

    const now = Date.now()
    if (now - lastAlertTimeRef.current < COOLDOWN) return

    // Helper to check and trigger
    const checkAndTrigger = (condition: boolean, config: AlertConfig) => {
      if (condition) {
        lastAlertTimeRef.current = Date.now()
        
        toast.warning(config.title, {
          description: config.description,
          duration: Infinity, // Keep open until user interacts
          action: {
            label: config.actionLabel,
            onClick: async () => {
              const success = await config.action()
              if (success) {
                toast.success("已自动调整设备")
              } else {
                toast.error("设备调整失败")
              }
            }
          },
          cancel: {
            label: '忽略',
            onClick: () => {
              toast.info("已忽略建议")
            }
          },
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
