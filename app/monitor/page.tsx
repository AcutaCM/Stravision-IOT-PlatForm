"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { CloudSun, LeafIcon, Activity, Hand, Search, Settings, Plus, Thermometer, Droplets, Sun, Wind, AlertCircle, TrendingUp, Wifi, WifiOff } from "lucide-react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useState, useEffect } from "react"

export default function MonitorPage() {
  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()
  
  // Use shared weather data from context
  const { weatherData, loading: weatherLoading } = useWeatherContext()
  
  // Track EC value history for chart (last 20 data points)
  const [ecHistory, setEcHistory] = useState<number[]>([])
  
  useEffect(() => {
    if (deviceData?.earth_ec !== undefined) {
      setEcHistory(prev => {
        const newHistory = [...prev, deviceData.earth_ec]
        // Keep only last 20 data points
        return newHistory.slice(-20)
      })
    }
  }, [deviceData?.earth_ec])
  return (
    <>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
        }
        @keyframes drift {
          0% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(30px) translateY(-10px); }
          100% { transform: translateX(0px) translateY(0px); }
        }
        @keyframes rain {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-drift { animation: drift 8s ease-in-out infinite; }
        .animate-rain { animation: rain 1s linear infinite; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
      <div className="min-h-screen w-screen h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0E1524] to-[#0a0e1a] text-white">
      <div className="grid grid-rows-[72px_1fr] h-full w-full">
        <div className="relative flex items-center px-8 border-b border-white/5 bg-[#0a0e1a]/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 text-white">
            <Image src="/logo.svg" alt="logo" width={64} height={64} />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wide">STRAVISION</div>
              <div className="text-xs text-white/60">莓界 · 智慧农业平台</div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <PageNavigation />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {connectionStatus.connected ? (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
                <Wifi className="size-3 mr-1" />
                已连接
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
                <WifiOff className="size-3 mr-1" />
                {connectionStatus.error || '未连接'}
              </Badge>
            )}
            {connectionStatus.lastUpdate && (
              <span className="text-xs text-white/40">
                更新: {connectionStatus.lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="relative px-8 pb-8 pt-6">
          <div className="grid grid-cols-[1fr_440px] gap-6 h-[calc(100vh-72px-56px)]">
            <div className="relative rounded-3xl bg-gradient-to-br from-[#0f1419] to-[#0a0e14] border border-white/5 shadow-2xl overflow-hidden">
              {/* 3D 视图区域 - 这里可以放置 3D 模型或图像 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/20 text-center">
                  <CloudSun className="size-32 mx-auto mb-4" strokeWidth={0.5} />
                  <p className="text-lg">3D 农作物监测视图</p>
                </div>
              </div>
              
              {/* 天气卡片 */}
              {(() => {
                // 根据天气状况确定样式
                const getWeatherStyle = (code: number) => {
                  // 晴天
                  if (code === 1000) {
                    return {
                      gradient: 'from-amber-500/30 via-orange-500/20 to-yellow-500/30',
                      border: 'border-amber-400/30',
                      icon: <Sun className="size-6 text-amber-300 animate-pulse" />,
                      particles: Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute size-1 bg-yellow-300/60 rounded-full animate-float"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                          }}
                        />
                      ))
                    }
                  }
                  // 多云
                  if ([1003, 1006, 1009].includes(code)) {
                    return {
                      gradient: 'from-slate-500/30 via-gray-500/20 to-blue-500/20',
                      border: 'border-slate-400/30',
                      icon: <CloudSun className="size-6 text-slate-300 animate-bounce-slow" />,
                      particles: Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute size-8 bg-white/10 rounded-full blur-xl animate-drift"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 60}%`,
                            animationDelay: `${Math.random() * 4}s`,
                            animationDuration: `${6 + Math.random() * 3}s`
                          }}
                        />
                      ))
                    }
                  }
                  // 雨天
                  if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
                    return {
                      gradient: 'from-blue-600/30 via-cyan-600/20 to-blue-700/30',
                      border: 'border-blue-400/40',
                      icon: <Droplets className="size-6 text-blue-300 animate-bounce" />,
                      particles: Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-0.5 h-4 bg-blue-300/40 animate-rain"
                          style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${0.5 + Math.random() * 0.5}s`
                          }}
                        />
                      ))
                    }
                  }
                  // 默认
                  return {
                    gradient: 'from-blue-500/20 to-cyan-500/20',
                    border: 'border-white/10',
                    icon: <CloudSun className="size-6 text-white/80" />,
                    particles: []
                  }
                }
                
                const weatherStyle = weatherData?.current ? getWeatherStyle(weatherData.current.condition.code) : {
                  gradient: 'from-blue-500/20 to-cyan-500/20',
                  border: 'border-white/10',
                  icon: <CloudSun className="size-6 text-white/80" />,
                  particles: []
                }
                
                return (
                  <Card className={`absolute left-6 bottom-6 w-[320px] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md bg-gradient-to-br ${weatherStyle.gradient} ${weatherStyle.border} border transition-all duration-700`}>
                    {/* 动态粒子效果 */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {weatherStyle.particles}
                    </div>
                    
                    <CardContent className="p-5 relative z-10">
                      {weatherLoading ? (
                        <div className="text-white/50 text-center py-4">加载天气数据...</div>
                      ) : weatherData?.current ? (
                        <div className="flex items-start justify-between">
                          <div className="space-y-3">
                            <div className="flex items-baseline gap-1">
                              <span className="text-5xl font-bold text-white animate-fade-in">
                                {Math.round(weatherData.current.temp_c)}
                              </span>
                              <span className="text-2xl text-white/80">°C</span>
                            </div>
                            <div className="space-y-1 text-sm text-white/70">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="size-4" />
                                <span>最高 {Math.round(weatherData.forecast?.forecastday?.[0]?.day?.maxtemp_c || 0)}°C</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="size-4 rotate-180" />
                                <span>最低 {Math.round(weatherData.forecast?.forecastday?.[0]?.day?.mintemp_c || 0)}°C</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                              {weatherData.location.name === 'Ningbo' ? '宁波' : weatherData.location.name}
                            </Badge>
                            <div className="flex items-center gap-2 text-white/90">
                              {weatherStyle.icon}
                              <span className="text-sm font-medium">{weatherData.current.condition.text}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-white/50 text-center py-4">天气数据不可用</div>
                      )}
                    </CardContent>
                  </Card>
                )
              })()}
              
              {/* 工具栏 */}
              <div className="absolute right-6 bottom-6 flex flex-col items-center gap-3">
                <Button size="icon" className="size-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm shadow-lg transition-all hover:scale-110">
                  <Hand className="size-5" />
                </Button>
                <Button size="icon" className="size-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm shadow-lg transition-all hover:scale-110">
                  <Search className="size-5" />
                </Button>
                <Button size="icon" className="size-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm shadow-lg transition-all hover:scale-110">
                  <Settings className="size-5" />
                </Button>
                <Button size="icon" className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all hover:scale-110">
                  <Plus className="size-5" />
                </Button>
              </div>
            </div>
            <Card className="h-full rounded-3xl bg-gradient-to-br from-[#0f1419] to-[#0a0e14] border border-white/5 text-white shadow-2xl overflow-auto">
              <CardHeader className="px-6 pt-6 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-white">草莓栽培监测</CardTitle>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
                    实时数据
                  </Badge>
                </div>
                <Separator className="bg-white/5" />
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                <Card className="rounded-xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/5 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white/90 font-semibold">环境参数</h3>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-300">实时</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 p-3 hover:border-orange-500/40 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Thermometer className="size-4 text-orange-400" />
                          <span className="text-xs text-orange-300/80 font-medium">温度</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {deviceData ? (deviceData.temperature / 10).toFixed(1) : '--'}°C
                        </div>
                      </Card>
                      
                      <Card className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 p-3 hover:border-red-500/40 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Thermometer className="size-4 text-red-400" />
                          <span className="text-xs text-red-300/80 font-medium">土壤温度</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {deviceData ? (deviceData.earth_temp / 10).toFixed(1) : '--'}°C
                        </div>
                      </Card>
                      
                      <Card className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 p-3 hover:border-yellow-500/40 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Sun className="size-4 text-yellow-400" />
                          <span className="text-xs text-yellow-300/80 font-medium">光照</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {deviceData ? deviceData.light : '--'} lux
                        </div>
                      </Card>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 p-3 hover:border-cyan-500/40 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Wind className="size-4 text-cyan-400" />
                          <span className="text-xs text-cyan-300/80 font-medium">CO₂</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {deviceData ? deviceData.co2 : '--'} ppm
                        </div>
                      </Card>
                      
                      <Card className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 p-3 hover:border-blue-500/40 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Droplets className="size-4 text-blue-400" />
                          <span className="text-xs text-blue-300/80 font-medium">湿度</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'}%
                        </div>
                      </Card>
                      
                      <Card className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 p-3 hover:border-purple-500/40 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Droplets className="size-4 text-purple-400" />
                          <span className="text-xs text-purple-300/80 font-medium">土壤湿度</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {deviceData ? deviceData.earth_water : '--'}%
                        </div>
                      </Card>
                    </div>
                  </div>
                </Card>
                
                <Card className="rounded-xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-white/90">
                        <Activity className="size-5" />
                        <span className="font-semibold">土壤 EC 值趋势</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <div className="text-2xl font-bold text-white">
                            {deviceData ? deviceData.earth_ec : '--'}
                          </div>
                          <div className="text-xs text-white/60">μS/cm</div>
                        </div>
                        <Badge variant="outline" className="border-green-500/30 text-green-300">实时</Badge>
                      </div>
                    </div>
                    <svg viewBox="0 0 360 120" className="w-full h-[120px]">
                      <defs>
                        <linearGradient id="ecGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {ecHistory.length > 1 && (() => {
                        const maxEc = Math.max(...ecHistory, 1)
                        const minEc = Math.min(...ecHistory, 0)
                        const range = maxEc - minEc || 1
                        const points = ecHistory.map((value, index) => {
                          const x = (index / (ecHistory.length - 1)) * 360
                          const y = 100 - ((value - minEc) / range) * 80
                          return `${x},${y}`
                        }).join(' ')
                        const pathD = ecHistory.map((value, index) => {
                          const x = (index / (ecHistory.length - 1)) * 360
                          const y = 100 - ((value - minEc) / range) * 80
                          return index === 0 ? `M${x},${y}` : `L${x},${y}`
                        }).join(' ')
                        const areaD = `${pathD} L360,120 L0,120 Z`
                        return (
                          <>
                            <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />
                            <path d={areaD} fill="url(#ecGradient)" />
                          </>
                        )
                      })()}
                      {ecHistory.length <= 1 && (
                        <text x="180" y="60" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="14">
                          等待数据...
                        </text>
                      )}
                    </svg>
                    <div className="mt-2 text-xs text-white/50 text-center">
                      电导率 (Electrical Conductivity) - 最近 {ecHistory.length} 个数据点
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/5 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/90">
                        <LeafIcon className="size-5" />
                        <span className="font-semibold">土壤养分 (NPK)</span>
                      </div>
                      <Badge variant="outline" className="border-green-500/30 text-green-300">实时</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-8 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-sm">N</div>
                          <span className="text-xs text-purple-300/80 font-medium">氮</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {deviceData ? deviceData.earth_n : '--'}
                        </div>
                        <div className="text-xs text-white/50 mt-1">mg/kg</div>
                      </Card>
                      
                      <Card className="rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-8 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold text-sm">P</div>
                          <span className="text-xs text-pink-300/80 font-medium">磷</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {deviceData ? deviceData.earth_p : '--'}
                        </div>
                        <div className="text-xs text-white/50 mt-1">mg/kg</div>
                      </Card>
                      
                      <Card className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-8 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm">K</div>
                          <span className="text-xs text-amber-300/80 font-medium">钾</span>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {deviceData ? deviceData.earth_k : '--'}
                        </div>
                        <div className="text-xs text-white/50 mt-1">mg/kg</div>
                      </Card>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/5 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/90">
                        <LeafIcon className="size-5" />
                        <span className="font-semibold">植株生长状态</span>
                      </div>
                      <Badge variant="outline" className="border-green-500/30 text-green-300">第4阶段</Badge>
                    </div>
                    
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="aspect-square rounded-lg bg-gradient-to-br from-[#1F2937] to-[#0f1419] border border-white/10 grid place-content-center hover:border-green-500/30 transition-all group"
                        >
                          <LeafIcon className="size-6 text-white/70 group-hover:text-green-400 transition-colors" />
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="bg-white/5" />
                    
                    <div>
                      <div className="text-white/70 text-sm mb-3">健康度热力图</div>
                      <div className="grid grid-cols-6 gap-2">
                        {[
                          { color: "#9EE09E", label: "优秀" },
                          { color: "#A5F28F", label: "良好" },
                          { color: "#C8FF8F", label: "正常" },
                          { color: "#FFB3C1", label: "注意" },
                          { color: "#FF8FA3", label: "警告" },
                          { color: "#FF6F91", label: "异常" }
                        ].map((item, i) => (
                          <div 
                            key={i} 
                            className="aspect-square rounded-lg border border-white/10 hover:scale-105 transition-all cursor-pointer relative group"
                            style={{ backgroundColor: item.color }}
                          >
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors" />
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {item.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}