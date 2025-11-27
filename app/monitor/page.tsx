"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { CloudIcon, SunIcon, SparklesIcon, ChartBarIcon, HandRaisedIcon, MagnifyingGlassIcon, Cog6ToothIcon, PlusIcon, FireIcon, BeakerIcon, ExclamationCircleIcon, ArrowTrendingUpIcon, WifiIcon } from "@heroicons/react/24/outline"
import { WifiIcon as WifiOffIcon } from "@heroicons/react/24/solid" // Using solid for off state or just style it differently
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { ModeToggle } from "@/components/mode-toggle"

export default function MonitorPage() {
  const router = useRouter()

  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()

  // Use shared weather data from context
  const { weatherData, loading: weatherLoading } = useWeatherContext()

  // Track EC value history for chart (last 20 data points)
  const [ecHistory, setEcHistory] = useState<number[]>([])

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()

        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
        } else {
          // Not authenticated, redirect to login
          router.push("/login")
        }
      } catch (error) {
        console.error("获取用户信息失败:", error)
        router.push("/login")
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchCurrentUser()
  }, [router])

  useEffect(() => {
    if (deviceData?.earth_ec !== undefined) {
      setEcHistory(prev => {
        const newHistory = [...prev, deviceData.earth_ec]
        // Keep only last 20 data points
        return newHistory.slice(-20)
      })
    }
  }, [deviceData?.earth_ec])

  // Show loading state while checking authentication
  if (isLoadingUser) {
    return (
      <div className="min-h-screen w-screen h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">加载中...</div>
      </div>
    )
  }

  // Don't render page if no user (will redirect)
  if (!currentUser) {
    return null
  }
  return (
    <>
      <div className="min-h-screen w-screen h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-[float_10s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] animate-[float_12s_ease-in-out_infinite_reverse]" />
        </div>

        <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
          {/* Header */}
          <div className="relative flex items-center px-8 border-b border-border/40 bg-background/60 backdrop-blur-md z-20">
            <div className="flex items-center gap-4">
              <div className="relative size-12 animate-[breathe_4s_ease-in-out_infinite]">
                <Image src="/logo.svg" alt="logo" fill className="object-contain" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold tracking-wide">STRAVISION</div>
                <div className="text-xs text-muted-foreground">莓界 · 智慧农业平台</div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <PageNavigation />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <ModeToggle />
              {connectionStatus.connected ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  <WifiIcon className="size-3 mr-1" />
                  已连接
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                  <WifiOffIcon className="size-3 mr-1 text-red-500" />
                  {connectionStatus.error || '未连接'}
                </Badge>
              )}
              <UserAvatarMenu user={currentUser} />
            </div>
          </div>

          {/* Main Content */}
          <div className="relative px-4 md:px-8 pb-8 pt-6 overflow-y-auto md:overflow-hidden h-full">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-8 h-auto lg:h-[calc(100vh-72px-56px)]">

              {/* Left Panel - 3D View */}
              <div className="relative rounded-3xl glass overflow-hidden group">
                {/* 3D Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/50 to-background/50">
                  <div className="text-muted-foreground/40 text-center transition-transform duration-700 group-hover:scale-105">
                    <CloudIcon className="size-32 mx-auto mb-4 animate-[float_6s_ease-in-out_infinite]" strokeWidth={0.5} />
                    <p className="text-lg font-light tracking-widest">3D 农作物监测视图</p>
                  </div>
                </div>

                {/* Weather Card */}
                {(() => {
                  const getWeatherStyle = (code: number) => {
                    // Sunny / Clear
                    if (code === 1000) return {
                      icon: <SunIcon className="size-6 text-amber-500 animate-[spin_12s_linear_infinite]" />,
                      containerClass: "bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-amber-400/30 shadow-[0_0_30px_rgba(251,191,36,0.2)]",
                      textClass: "text-amber-700 dark:text-amber-100"
                    }
                    // Cloudy / Overcast
                    if ([1003, 1006, 1009].includes(code)) return {
                      icon: <CloudIcon className="size-6 text-blue-400 animate-[pulse_4s_ease-in-out_infinite]" />,
                      containerClass: "bg-gradient-to-br from-blue-400/10 to-slate-500/10 border-blue-400/20",
                      textClass: "text-blue-900 dark:text-blue-100"
                    }
                    // Rain / Drizzle
                    if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return {
                      icon: <BeakerIcon className="size-6 text-blue-500 animate-[bounce_2s_infinite]" />,
                      containerClass: "bg-gradient-to-br from-blue-600/20 to-indigo-700/20 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]",
                      textClass: "text-blue-950 dark:text-blue-50"
                    }
                    // Default
                    return {
                      icon: <CloudIcon className="size-6 text-muted-foreground" />,
                      containerClass: "glass",
                      textClass: "text-foreground"
                    }
                  }

                  const weatherStyle = weatherData?.current
                    ? getWeatherStyle(weatherData.current.condition.code)
                    : {
                      icon: <CloudIcon className="size-6 text-muted-foreground" />,
                      containerClass: "glass",
                      textClass: "text-foreground"
                    }

                  return (
                    <Card className={`absolute left-6 bottom-6 w-[320px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-1000 ${weatherStyle.containerClass}`}>
                      <CardContent className="p-5 relative z-10">
                        {weatherLoading ? (
                          <div className="text-muted-foreground text-center py-4">加载天气数据...</div>
                        ) : weatherData?.current ? (
                          <div className="flex items-start justify-between">
                            <div className="space-y-3">
                              <div className="flex items-baseline gap-1">
                                <span className={`text-5xl font-bold animate-[fade-in_0.5s_ease-out] ${weatherStyle.textClass}`}>
                                  {Math.round(weatherData.current.temp_c)}
                                </span>
                                <span className={`text-2xl ${weatherStyle.textClass} opacity-80`}>°C</span>
                              </div>
                              <div className={`space-y-1 text-sm ${weatherStyle.textClass} opacity-80`}>
                                <div className="flex items-center gap-2">
                                  <ArrowTrendingUpIcon className="size-4" />
                                  <span>最高 {Math.round(weatherData.forecast?.forecastday?.[0]?.day?.maxtemp_c || 0)}°C</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ArrowTrendingUpIcon className="size-4 rotate-180" />
                                  <span>最低 {Math.round(weatherData.forecast?.forecastday?.[0]?.day?.mintemp_c || 0)}°C</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                              <Badge variant="secondary" className="bg-background/20 backdrop-blur-md border-white/10 text-current">
                                {weatherData.location.name === 'Ningbo' ? '宁波' : weatherData.location.name}
                              </Badge>
                              <div className={`flex items-center gap-2 justify-end ${weatherStyle.textClass}`}>
                                {weatherStyle.icon}
                                <span className="text-sm font-medium">{weatherData.current.condition.text}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-center py-4">天气数据不可用</div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Floating Toolbar */}
                <div className="absolute right-6 bottom-6 flex flex-col items-center gap-3">
                  {[HandRaisedIcon, MagnifyingGlassIcon, Cog6ToothIcon].map((Icon, i) => (
                    <Button key={i} size="icon" variant="secondary" className="size-12 rounded-full shadow-lg hover:scale-110 transition-all duration-300 bg-background/40 backdrop-blur-md border border-border">
                      <Icon className="size-5 text-foreground/80" />
                    </Button>
                  ))}
                  <Button size="icon" className="size-12 rounded-full shadow-lg hover:scale-110 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <PlusIcon className="size-5" />
                  </Button>
                </div>
              </div>

              {/* Right Panel - Data Dashboard */}
              <Card className="h-full rounded-3xl glass shadow-2xl overflow-hidden flex flex-col">
                <CardHeader className="px-6 pt-6 pb-4 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                      <SparklesIcon className="size-5 text-primary" />
                      草莓栽培监测
                    </CardTitle>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 animate-pulse">
                      实时数据
                    </Badge>
                  </div>
                  <Separator className="bg-border/50" />
                </CardHeader>

                <CardContent className="space-y-5 px-6 pb-6 overflow-y-auto custom-scrollbar">
                  {/* Environment Params */}
                  <Card className="rounded-2xl bg-secondary/30 border-none p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-foreground/90 font-semibold text-sm">环境参数</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: FireIcon, label: "温度", value: deviceData ? (deviceData.temperature / 10).toFixed(1) : '--', unit: "°C", color: "text-orange-500", bg: "bg-orange-500/10" },
                        { icon: FireIcon, label: "土温", value: deviceData ? (deviceData.earth_temp / 10).toFixed(1) : '--', unit: "°C", color: "text-red-500", bg: "bg-red-500/10" },
                        { icon: SunIcon, label: "光照", value: deviceData ? deviceData.light : '--', unit: "lux", color: "text-yellow-500", bg: "bg-yellow-500/10" },
                      ].map((item, i) => (
                        <div key={i} className={`rounded-xl p-3 ${item.bg} hover:scale-105 transition-transform duration-300 cursor-default`}>
                          <div className="flex items-center gap-2 mb-2">
                            <item.icon className={`size-4 ${item.color}`} />
                            <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                          </div>
                          <div className="text-xl font-bold text-foreground">
                            {item.value}<span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: CloudIcon, label: "CO₂", value: deviceData ? deviceData.co2 : '--', unit: "ppm", color: "text-cyan-500", bg: "bg-cyan-500/10" },
                        { icon: BeakerIcon, label: "湿度", value: deviceData ? (deviceData.humidity / 10).toFixed(1) : '--', unit: "%", color: "text-blue-500", bg: "bg-blue-500/10" },
                        { icon: BeakerIcon, label: "土湿", value: deviceData ? (deviceData.earth_water / 10) : '--', unit: "%", color: "text-purple-500", bg: "bg-purple-500/10" },
                      ].map((item, i) => (
                        <div key={i} className={`rounded-xl p-3 ${item.bg} hover:scale-105 transition-transform duration-300 cursor-default`}>
                          <div className="flex items-center gap-2 mb-2">
                            <item.icon className={`size-4 ${item.color}`} />
                            <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {item.value}<span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* EC Chart */}
                  <Card className="rounded-2xl bg-secondary/30 border-none p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-foreground/90">
                        <ChartBarIcon className="size-4 text-primary" />
                        <span className="font-semibold text-sm">土壤 EC 值趋势</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary mr-1">
                          {deviceData ? deviceData.earth_ec : '--'}
                        </span>
                        <span className="text-xs text-muted-foreground">μS/cm</span>
                      </div>
                    </div>
                    <div className="h-[100px] w-full relative">
                      <svg viewBox="0 0 360 100" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="ecGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {ecHistory.length > 1 ? (() => {
                          const maxEc = Math.max(...ecHistory, 1)
                          const minEc = Math.min(...ecHistory, 0)
                          const range = maxEc - minEc || 1
                          const points = ecHistory.map((value, index) => {
                            const x = (index / (ecHistory.length - 1)) * 360
                            const y = 100 - ((value - minEc) / range) * 80
                            return `${x},${y}`
                          }).join(' ')
                          const areaD = `${points} L360,100 L0,100 Z`
                          return (
                            <>
                              <path d={`M${points.replace(/ /g, ' L')}`} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />
                              <path d={areaD} fill="url(#ecGradient)" />
                            </>
                          )
                        })() : (
                          <text x="180" y="50" textAnchor="middle" fill="currentColor" className="text-muted-foreground text-sm">
                            等待数据...
                          </text>
                        )}
                      </svg>
                    </div>
                  </Card>

                  {/* NPK */}
                  <Card className="rounded-2xl bg-secondary/30 border-none p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground/90">
                        <SparklesIcon className="size-4 text-green-500" />
                        <span className="font-semibold text-sm">土壤养分 (NPK)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "氮", symbol: "N", value: deviceData ? deviceData.earth_n : '--', color: "bg-purple-500" },
                        { label: "磷", symbol: "P", value: deviceData ? deviceData.earth_p : '--', color: "bg-pink-500" },
                        { label: "钾", symbol: "K", value: deviceData ? deviceData.earth_k : '--', color: "bg-amber-500" },
                      ].map((item, i) => (
                        <div key={i} className="rounded-xl bg-background/50 p-3 flex flex-col items-center gap-2 hover:bg-background/80 transition-colors">
                          <div className={`size-8 rounded-full ${item.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                            {item.symbol}
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-foreground leading-none mb-1">{item.value}</div>
                            <div className="text-[10px] text-muted-foreground">mg/kg</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Growth Status */}
                  <Card className="rounded-2xl bg-secondary/30 border-none p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground/90">
                        <SparklesIcon className="size-4 text-green-600" />
                        <span className="font-semibold text-sm">植株生长状态</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">第4阶段</Badge>
                    </div>

                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-lg bg-background/50 border border-border/50 grid place-content-center hover:border-green-500/50 hover:text-green-500 transition-all group cursor-pointer"
                        >
                          <SparklesIcon className="size-5 text-muted-foreground group-hover:scale-110 transition-transform" />
                        </div>
                      ))}
                    </div>

                    <Separator className="bg-border/50" />

                    <div>
                      <div className="text-muted-foreground text-xs mb-3">健康度热力图</div>
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
                            className="aspect-square rounded-lg hover:scale-110 transition-all cursor-pointer relative group shadow-sm"
                            style={{ backgroundColor: item.color }}
                          >
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-foreground bg-background/90 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-sm">
                              {item.label}
                            </div>
                          </div>
                        ))}
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