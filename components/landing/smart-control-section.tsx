"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { Cpu, Wind, Droplets, Sun, CheckCircle2, Zap, Brain, Radio, BarChart3 } from "lucide-react"

export function SmartControlSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [50, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0])

  return (
    <section ref={containerRef} className="py-32 px-4 relative z-10 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        
        {/* Text Content */}
        <motion.div 
          style={{ opacity, x: useTransform(scrollYProgress, [0, 0.5], [-30, 0]) }}
          className="space-y-10"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
              <Brain className="w-4 h-4" />
              <span>AI 智能托管</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              把农场交给 AI，<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 animate-gradient-x">
                让种植更省心
              </span>
            </h2>
            
            <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
              Stravision 的智能大脑全天候监控环境数据。
              从自动补光到精准灌溉，一切调控在毫秒间完成。
              告别繁琐的人工操作，享受科技带来的轻松丰收。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { text: "自适应调控算法", icon: Brain },
              { text: "异常实时预警", icon: Radio },
              { text: "多设备协同策略", icon: Zap },
              { text: "节能优化模式", icon: BarChart3 }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-white/10 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 transition-colors">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-gray-200 font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Interactive Visual */}
        <div className="relative perspective-1000">
          <motion.div 
            style={{ y, rotateX: useTransform(scrollYProgress, [0, 1], [5, -5]) }}
            className="relative bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Glass Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

            {/* Simulation Header */}
            <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-mono font-bold text-green-400 tracking-wider">SYSTEM ONLINE</span>
              </div>
            </div>

            {/* Metrics Simulation */}
            <div className="space-y-8 relative z-10">
              {[
                { label: "Temperature Control", value: "24.5°C", icon: Wind, color: "text-blue-400", bg: "bg-blue-500", glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]" },
                { label: "Humidity Regulation", value: "62%", icon: Droplets, color: "text-cyan-400", bg: "bg-cyan-500", glow: "shadow-[0_0_15px_rgba(34,211,238,0.5)]" },
                { label: "Light Spectrum", value: "Adaptive", icon: Sun, color: "text-amber-400", bg: "bg-amber-500", glow: "shadow-[0_0_15px_rgba(251,191,36,0.5)]" },
              ].map((metric, i) => (
                <div key={i} className="space-y-3 group">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3 text-gray-300">
                      <div className={`p-2 rounded-lg bg-white/5 ${metric.color}`}>
                        <metric.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-0.5">{metric.label}</div>
                        <div className="text-lg font-bold text-white font-mono">{metric.value}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-mono ${metric.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      OPTIMIZING...
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                    <motion.div
                      className={`h-full ${metric.bg} ${metric.glow} relative`}
                      initial={{ width: "30%" }}
                      whileInView={{ width: ["30%", "85%", "60%"] }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        repeatType: "mirror",
                        delay: i * 0.5,
                        ease: "easeInOut" 
                      }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_10px_white]" />
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Tech Decoration */}
            <div className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-xs font-mono text-gray-600">
               <div className="flex gap-4">
                 <span>CPU: 32%</span>
                 <span>MEM: 1.2GB</span>
               </div>
               <span>ID: STR-8842-X</span>
            </div>

            {/* Floating Glow Effects inside Card */}
            <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] pointer-events-none mix-blend-screen animate-pulse" />
          </motion.div>
          
          {/* External Decorative Elements */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-10 -right-10 w-40 h-40 border border-white/5 rounded-full border-dashed -z-10" 
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-10 -left-10 w-60 h-60 border border-white/5 rounded-full border-dashed -z-10" 
          />
        </div>
      </div>
    </section>
  )
}
