"use client"

import { useDeviceData } from "@/lib/hooks/use-device-data"
import { cn } from "@/lib/utils"
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  Activity, 
  Zap, 
  Sprout, 
  Wifi, 
  WifiOff,
  Leaf,
  Gauge
} from "lucide-react"
import { motion } from "framer-motion"

export function DeviceBentoGrid() {
  const { deviceData, connectionStatus } = useDeviceData()

  // Mock data for preview if no real data is connected yet, or use 0
  const data = deviceData || {
    temperature: 0,
    humidity: 0,
    light: 0,
    co2: 0,
    earth_temp: 0,
    earth_water: 0,
    earth_ec: 0,
    earth_n: 0,
    earth_p: 0,
    earth_k: 0,
    relay5: 0,
    relay6: 0,
    relay7: 0,
    relay8: 0,
    led1: 0,
    led2: 0,
    led3: 0,
    led4: 0,
  }

  // Calculate Air Quality based on CO2
  const getAirQuality = (co2: number) => {
    if (co2 <= 1000) return { text: "优", color: "bg-green-500", labelColor: "text-green-600 dark:text-green-400" }
    if (co2 <= 1500) return { text: "良", color: "bg-yellow-500", labelColor: "text-yellow-600 dark:text-yellow-400" }
    return { text: "差", color: "bg-red-500", labelColor: "text-red-600 dark:text-red-400" }
  }

  // Calculate Growth Suitability
  const getGrowthStatus = (data: any) => {
    const temp = data.temperature / 10
    const humidity = data.humidity / 10
    const light = data.light
    const co2 = data.co2

    const isTempGood = temp >= 15 && temp <= 30
    const isHumidityGood = humidity >= 40 && humidity <= 90
    const isLightGood = light > 1000 // Basic threshold
    const isCo2Good = co2 < 2000

    if (isTempGood && isHumidityGood && isCo2Good) {
      if (light < 500) return { text: "光照不足", color: "text-orange-600 dark:text-orange-400" }
      return { text: "适宜生长", color: "text-green-600 dark:text-green-400" }
    }
    
    if (!isTempGood) return { text: temp < 15 ? "温度偏低" : "温度偏高", color: "text-red-600 dark:text-red-400" }
    if (!isHumidityGood) return { text: humidity < 40 ? "环境干燥" : "湿度过高", color: "text-blue-600 dark:text-blue-400" }
    
    return { text: "需调节", color: "text-yellow-600 dark:text-yellow-400" }
  }

  const airQuality = getAirQuality(data.co2)
  const growthStatus = getGrowthStatus(data)

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

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto p-2"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[120px]">
        
        {/* Main Environment Card - Large (2x2) */}
        <motion.div 
          variants={item}
          className="col-span-2 row-span-2 relative overflow-hidden rounded-[32px] p-6 shadow-lg group transition-all hover:scale-[1.02] duration-300 border border-white/20 dark:border-white/5"
          style={{
            background: "var(--card-bg-blur, rgba(255, 255, 255, 0.1))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-orange-500/10 dark:from-rose-500/5 dark:to-orange-500/5 opacity-100 pointer-events-none" />
          
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Thermometer size={120} className="text-rose-500 rotate-12" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-between text-gray-700 dark:text-gray-200">
            <div className="flex items-center gap-2 bg-white/10 dark:bg-black/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 shadow-sm">
               <Thermometer size={14} className="text-rose-500" />
               <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">环境监测</span>
            </div>
            
            <div className="space-y-2 my-auto pl-2">
              <div className="text-7xl font-bold tracking-tighter text-gray-800 dark:text-white flex items-baseline gap-2 drop-shadow-sm">
                {data.temperature / 10} <span className="text-3xl font-medium text-gray-500 dark:text-gray-400">°C</span>
              </div>
              <div className="text-lg font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Droplets size={18} className="text-blue-400" />
                湿度: {data.humidity / 10}%
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm font-medium text-gray-500 dark:text-gray-400 bg-white/5 dark:bg-black/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
               <span className={cn("flex items-center gap-2 transition-colors", airQuality.labelColor)}>
                 <div className={cn("size-2.5 rounded-full shadow-sm", airQuality.color)} /> 
                 空气质量: {airQuality.text}
               </span>
               <span className="opacity-70 text-xs">刚刚更新</span>
            </div>
          </div>
        </motion.div>

        {/* Light Card - Wide (2x1) */}
        <motion.div 
          variants={item}
          className="col-span-2 relative overflow-hidden rounded-[32px] p-5 shadow-lg group hover:scale-[1.02] transition-transform duration-300 border border-white/20 dark:border-white/5"
          style={{
            background: "var(--card-bg-blur, rgba(255, 255, 255, 0.1))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 dark:from-amber-500/5 dark:to-yellow-500/5 opacity-100 pointer-events-none" />
          <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
            <Sun size={140} className="text-amber-400" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-between text-gray-700 dark:text-gray-200">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 bg-white/10 dark:bg-black/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 shadow-sm">
                  <Sun size={14} className="text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">光照强度</span>
               </div>
               <div className="text-3xl font-bold text-gray-800 dark:text-white drop-shadow-sm">{data.light} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Lux</span></div>
            </div>
            <div className={cn("text-sm font-medium transition-colors bg-white/5 dark:bg-black/10 w-fit px-3 py-1 rounded-lg backdrop-blur-sm", growthStatus.color)}>
              {growthStatus.text}
            </div>
          </div>
        </motion.div>

        {/* CO2 Card - Small (1x1) */}
        <motion.div 
          variants={item}
          className="relative overflow-hidden rounded-[32px] p-5 shadow-lg hover:scale-[1.02] transition-transform duration-300 border border-white/20 dark:border-white/5"
          style={{
            background: "var(--card-bg-blur, rgba(255, 255, 255, 0.1))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5 opacity-100 pointer-events-none" />
           <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wind size={80} className="text-emerald-500" />
           </div>
           
           <div className="relative z-10 h-full flex flex-col justify-between text-gray-700 dark:text-gray-200">
             <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Wind size={18} />
                <span className="font-bold text-sm">CO2</span>
             </div>
             <div className="text-3xl font-bold text-gray-800 dark:text-white drop-shadow-sm">{data.co2}<span className="text-sm ml-1 text-gray-500 dark:text-gray-400 font-normal">ppm</span></div>
           </div>
        </motion.div>

        {/* Soil Moisture - Small (1x1) */}
        <motion.div 
          variants={item}
          className="relative overflow-hidden rounded-[32px] p-5 shadow-lg hover:scale-[1.02] transition-transform duration-300 border border-white/20 dark:border-white/5"
          style={{
            background: "var(--card-bg-blur, rgba(255, 255, 255, 0.1))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 dark:from-sky-500/5 dark:to-indigo-500/5 opacity-100 pointer-events-none" />
           <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sprout size={80} className="text-sky-500" />
           </div>
           
           <div className="relative z-10 h-full flex flex-col justify-between text-gray-700 dark:text-gray-200">
             <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <Sprout size={18} />
                <span className="font-bold text-sm">土壤水分</span>
             </div>
             <div className="text-3xl font-bold text-gray-800 dark:text-white drop-shadow-sm">{data.earth_water / 10}<span className="text-sm ml-1 text-gray-500 dark:text-gray-400 font-normal">%</span></div>
           </div>
        </motion.div>

        {/* Soil Detailed Stats - Wide (2x1) */}
        <motion.div 
          variants={item}
          className="col-span-2 relative overflow-hidden rounded-[32px] p-5 shadow-lg hover:scale-[1.02] transition-transform duration-300 border border-white/20 dark:border-white/5"
          style={{
            background: "var(--card-bg-blur, rgba(255, 255, 255, 0.1))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5 opacity-100 pointer-events-none" />
           <div className="absolute -right-8 -top-8 opacity-10 group-hover:opacity-20 transition-opacity rotate-180">
              <Leaf size={140} className="text-cyan-500" />
           </div>
           
           <div className="relative z-10 flex flex-col h-full justify-between text-gray-700 dark:text-gray-200">
             <div className="flex items-center gap-2 mb-2 bg-white/10 dark:bg-black/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 shadow-sm">
                <Leaf size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">土壤营养元素 (NPK)</span>
             </div>
             <div className="grid grid-cols-3 gap-4 text-center">
                <div className="relative group/stat">
                   <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">氮 (N)</div>
                   <div className="text-2xl font-bold text-gray-800 dark:text-white drop-shadow-sm group-hover/stat:text-cyan-600 transition-colors">{data.earth_n}</div>
                </div>
                <div className="border-x border-gray-200/20 dark:border-white/10 relative group/stat">
                   <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">磷 (P)</div>
                   <div className="text-2xl font-bold text-gray-800 dark:text-white drop-shadow-sm group-hover/stat:text-blue-600 transition-colors">{data.earth_p}</div>
                </div>
                <div className="relative group/stat">
                   <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">钾 (K)</div>
                   <div className="text-2xl font-bold text-gray-800 dark:text-white drop-shadow-sm group-hover/stat:text-indigo-600 transition-colors">{data.earth_k}</div>
                </div>
             </div>
           </div>
        </motion.div>

        {/* Status/Connection - Wide (2x1) */}
        <motion.div 
          variants={item}
          className="col-span-2 relative overflow-hidden rounded-[32px] p-5 shadow-lg hover:shadow-xl transition-all border border-white/20 dark:border-white/5 group"
          style={{
            background: "var(--card-bg-blur, rgba(255, 255, 255, 0.1))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-gray-50/50 dark:from-zinc-800/30 dark:to-zinc-900/30 opacity-100 pointer-events-none" />
           
           <div className="flex items-center justify-between h-full relative z-10">
              <div className="flex items-center gap-4">
                 <div className={cn(
                   "size-12 rounded-full flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-md transition-all duration-500",
                   connectionStatus.connected 
                     ? "bg-green-500/10 text-green-500 shadow-green-500/20 group-hover:scale-110 group-hover:bg-green-500/20" 
                     : "bg-red-500/10 text-red-500 shadow-red-500/20 group-hover:scale-110 group-hover:bg-red-500/20"
                 )}>
                    {connectionStatus.connected ? <Wifi size={24} /> : <WifiOff size={24} />}
                 </div>
                 <div>
                    <div className="font-bold text-gray-800 dark:text-white text-lg">系统状态</div>
                    <div className={cn("text-xs font-medium flex items-center gap-1.5", connectionStatus.connected ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                       <div className={cn("size-1.5 rounded-full animate-pulse", connectionStatus.connected ? "bg-green-500" : "bg-red-500")} />
                       {connectionStatus.connected ? "在线监控中" : "离线 - 请检查连接"}
                    </div>
                 </div>
              </div>
              
              <div className="flex gap-2 bg-black/5 dark:bg-white/5 p-2 rounded-2xl backdrop-blur-sm">
                 {[1, 2, 3, 4].map(i => (
                   <div key={i} className={cn(
                     "size-3 rounded-full transition-all duration-500",
                     (data as any)[`led${i}`] 
                       ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] scale-110" 
                       : "bg-gray-300/50 dark:bg-gray-700/50"
                   )} />
                 ))}
              </div>
           </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
