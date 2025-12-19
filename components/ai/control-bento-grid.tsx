"use client"

import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { cn } from "@/lib/utils"
import { 
  Fan, 
  Droplets, 
  Lightbulb, 
  Zap,
  Power,
  Loader2
} from "lucide-react"
import { motion } from "framer-motion"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { toast } from "sonner"

export function ControlBentoGrid() {
  const { deviceData } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const [loading, setLoading] = useState<number | null>(null)

  const handleToggle = async (relayId: number, currentState: number) => {
    setLoading(relayId)
    try {
      const success = await toggleRelay(relayId, currentState)
      if (success) {
        const newState = currentState === 1 ? 0 : 1
        toast.success(`设备 ${relayId} 已${newState ? '开启' : '关闭'}`)
      }
    } catch (error) {
      // toast handled in hook
    } finally {
      setLoading(null)
    }
  }

  // Mock data if no real data
  const data = deviceData || {
    relay5: 0, // Water Pump
    relay6: 0, // Fan
    relay7: 0, // Grow Light
    relay8: 0, // White Light
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  const devices = [
    {
      id: 5,
      name: "灌溉水泵",
      icon: Droplets,
      state: data.relay5,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      onColor: "bg-blue-500 dark:bg-blue-600"
    },
    {
      id: 6,
      name: "通风风扇",
      icon: Fan,
      state: data.relay6,
      color: "text-cyan-500 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      onColor: "bg-cyan-500 dark:bg-cyan-600"
    },
    {
      id: 7,
      name: "补光灯",
      icon: Zap,
      state: data.relay7,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      onColor: "bg-purple-500 dark:bg-purple-600"
    },
    {
      id: 8,
      name: "白光照明",
      icon: Lightbulb,
      state: data.relay8,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      onColor: "bg-amber-500 dark:bg-amber-600"
    }
  ]

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto p-2"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {devices.map((device) => (
          <motion.div
            key={device.id}
            variants={item}
            className={cn(
              "relative overflow-hidden rounded-[24px] p-5 shadow-sm border transition-all duration-300",
              "bg-white/80 dark:bg-white/5 backdrop-blur-xl hover:shadow-md",
              device.state ? "border-gray-200 dark:border-white/20" : "border-gray-100 dark:border-white/10"
            )}
          >
            <div className="flex flex-col justify-between h-full gap-4">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "p-3 rounded-full transition-colors duration-300",
                  device.state ? device.bg : "bg-gray-100 dark:bg-white/10"
                )}>
                  <device.icon 
                    size={24} 
                    className={cn(
                      "transition-colors duration-300",
                      device.state ? device.color : "text-gray-400 dark:text-gray-500",
                      device.id === 6 && device.state ? "animate-spin" : ""
                    )} 
                  />
                </div>
                
                <div className="relative">
                   {loading === device.id && (
                     <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-10">
                       <Loader2 size={16} className="animate-spin text-gray-500 dark:text-gray-400" />
                     </div>
                   )}
                   <Switch 
                     checked={device.state === 1}
                     onCheckedChange={() => handleToggle(device.id, device.state)}
                     className={cn(
                       "data-[state=checked]:bg-black dark:data-[state=checked]:bg-white",
                       device.state ? "" : "bg-gray-200 dark:bg-gray-700"
                     )}
                   />
                </div>
              </div>

              <div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mb-1">{device.name}</div>
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "size-2 rounded-full",
                     device.state ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                   )} />
                   <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                     {device.state ? "运行中" : "已关闭"}
                   </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
