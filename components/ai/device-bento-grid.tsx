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
          className="col-span-2 row-span-2 relative overflow-hidden rounded-[32px] p-6 shadow-sm group transition-all hover:scale-[1.02] duration-300 border border-white/40"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-100/40 to-orange-100/40 opacity-60 pointer-events-none" />
          
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
             <Thermometer size={80} className="text-rose-500 rotate-12" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-between text-gray-700">
            <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
               <Thermometer size={14} className="text-rose-500" />
               <span className="text-xs font-bold uppercase tracking-wider text-rose-600/80">环境监测</span>
            </div>
            
            <div className="space-y-1 my-auto">
              <div className="text-6xl font-bold tracking-tighter text-gray-800 flex items-baseline gap-2">
                {data.temperature / 10} <span className="text-3xl font-medium text-gray-500">°C</span>
              </div>
              <div className="text-lg font-medium text-gray-600 flex items-center gap-2">
                <Droplets size={18} className="text-blue-400" />
                湿度: {data.humidity / 10}%
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm font-medium text-gray-500">
               <span className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-green-400" /> 空气质量: 优</span>
               <span className="opacity-70">刚刚更新</span>
            </div>
          </div>
        </motion.div>

        {/* Light Card - Wide (2x1) */}
        <motion.div 
          variants={item}
          className="col-span-2 relative overflow-hidden rounded-[32px] p-5 shadow-sm group hover:scale-[1.02] transition-transform duration-300 border border-white/40"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 to-yellow-100/40 opacity-60 pointer-events-none" />
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <Sun size={100} className="text-amber-400" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-between text-gray-700">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
                  <Sun size={14} className="text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600/80">光照强度</span>
               </div>
               <div className="text-2xl font-bold text-gray-800">{data.light} <span className="text-sm font-normal text-gray-500">Lux</span></div>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              适合生长
            </div>
          </div>
        </motion.div>

        {/* CO2 Card - Small (1x1) */}
        <motion.div 
          variants={item}
          className="relative overflow-hidden rounded-[32px] p-5 shadow-sm hover:scale-[1.02] transition-transform duration-300 border border-white/40"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)"
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 opacity-60 pointer-events-none" />
           <div className="relative z-10 h-full flex flex-col justify-between text-gray-700">
             <div className="flex items-center gap-2 text-emerald-600">
                <Wind size={18} />
                <span className="font-bold text-sm">CO2</span>
             </div>
             <div className="text-2xl font-bold text-gray-800">{data.co2}<span className="text-sm ml-1 text-gray-500 font-normal">ppm</span></div>
           </div>
        </motion.div>

        {/* Soil Moisture - Small (1x1) */}
        <motion.div 
          variants={item}
          className="relative overflow-hidden rounded-[32px] p-5 shadow-sm hover:scale-[1.02] transition-transform duration-300 border border-white/40"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)"
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-br from-sky-100/40 to-indigo-100/40 opacity-60 pointer-events-none" />
           <div className="relative z-10 h-full flex flex-col justify-between text-gray-700">
             <div className="flex items-center gap-2 text-sky-600">
                <Sprout size={18} />
                <span className="font-bold text-sm">土壤水分</span>
             </div>
             <div className="text-2xl font-bold text-gray-800">{data.earth_water / 10}<span className="text-sm ml-1 text-gray-500 font-normal">%</span></div>
           </div>
        </motion.div>

        {/* Soil Detailed Stats - Wide (2x1) */}
        <motion.div 
          variants={item}
          className="col-span-2 relative overflow-hidden rounded-[32px] p-5 shadow-sm hover:scale-[1.02] transition-transform duration-300 border border-white/40"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)"
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/40 to-blue-100/40 opacity-60 pointer-events-none" />
           <div className="relative z-10 flex flex-col h-full justify-between text-gray-700">
             <div className="flex items-center gap-2 mb-2 text-cyan-700">
                <Leaf size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">土壤营养元素 (NPK)</span>
             </div>
             <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                   <div className="text-xs text-gray-500 mb-1 font-medium">氮 (N)</div>
                   <div className="text-xl font-bold text-gray-800">{data.earth_n}</div>
                </div>
                <div className="border-x border-gray-200/50">
                   <div className="text-xs text-gray-500 mb-1 font-medium">磷 (P)</div>
                   <div className="text-xl font-bold text-gray-800">{data.earth_p}</div>
                </div>
                <div>
                   <div className="text-xs text-gray-500 mb-1 font-medium">钾 (K)</div>
                   <div className="text-xl font-bold text-gray-800">{data.earth_k}</div>
                </div>
             </div>
           </div>
        </motion.div>

        {/* Status/Connection - Wide (2x1) */}
        <motion.div 
          variants={item}
          className="col-span-2 relative overflow-hidden rounded-[32px] p-5 shadow-sm hover:shadow-md transition-all border border-white/60"
          style={{
            background: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
           <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-4">
                 <div className={cn(
                   "size-10 rounded-full flex items-center justify-center shadow-sm border border-white",
                   connectionStatus.connected ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                 )}>
                    {connectionStatus.connected ? <Wifi size={20} /> : <WifiOff size={20} />}
                 </div>
                 <div>
                    <div className="font-bold text-gray-800">系统状态</div>
                    <div className={cn("text-xs font-medium", connectionStatus.connected ? "text-green-600" : "text-red-500")}>
                       {connectionStatus.connected ? "在线监控中" : "离线 - 请检查连接"}
                    </div>
                 </div>
              </div>
              
              <div className="flex gap-2">
                 {[1, 2, 3, 4].map(i => (
                   <div key={i} className={cn(
                     "size-3 rounded-full transition-all duration-300",
                     (data as any)[`led${i}`] 
                       ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)] scale-110" 
                       : "bg-gray-200/80 inner-shadow"
                   )} />
                 ))}
              </div>
           </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
