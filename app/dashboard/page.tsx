"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import dynamic from "next/dynamic"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { Edit, Save, Wifi, WifiOff, Droplets, Sun, Wind, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { useState, useEffect } from "react"
import GridLayout, { Layout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false })
const VegaEmbed = dynamic(() => import("react-vega").then((mod) => mod.VegaEmbed), { ssr: false })

export default function DashboardPage() {
  const router = useRouter()

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()

  // Use shared weather data from context
  const { weatherData } = useWeatherContext()

  const defaultLayout = [
    { i: "humidity", x: 0, y: 0, w: 3, h: 2 },
    { i: "temperature", x: 3, y: 0, w: 3, h: 2 },
    { i: "light", x: 6, y: 0, w: 3, h: 2 },
    { i: "co2", x: 9, y: 0, w: 3, h: 2 },
    { i: "soilMoisture", x: 0, y: 2, w: 3, h: 2 },
    { i: "fertility", x: 3, y: 2, w: 3, h: 2 },
    { i: "nitrogen", x: 6, y: 2, w: 3, h: 2 },
    { i: "phosphorus", x: 9, y: 2, w: 3, h: 2 },
    { i: "potassium", x: 0, y: 4, w: 3, h: 2 },
    { i: "rainfall", x: 9, y: 4, w: 3, h: 2 },
  ]

  const [layout, setLayout] = useState(defaultLayout)
  const [isEditMode, setIsEditMode] = useState(false)

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()

        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
        } else {
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

  // 从 localStorage 加载布局
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout')
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout))
      } catch (e) {
        console.error('Failed to load layout:', e)
      }
    }
  }, [])

  const onLayoutChange = (newLayout: Layout[]) => {
    if (isEditMode) {
      setLayout(newLayout)
    }
  }

  const handleSaveLayout = () => {
    localStorage.setItem('dashboard-layout', JSON.stringify(layout))
    setIsEditMode(false)
    alert('布局已保存！')
  }

  const handleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  // Show loading state while checking authentication
  if (isLoadingUser) {
    return (
      <div className="min-h-screen w-screen h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  // Don't render page if no user (will redirect)
  if (!currentUser) {
    return null
  }

  return (
    <>
      <style jsx global>{`
        @keyframes rain-dashboard {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(300%); opacity: 0; }
        }
        @keyframes fade-in-dashboard {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes grow-bar {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
        .animate-rain-dashboard { animation: rain-dashboard 1.2s linear infinite; }
        .animate-fade-in-dashboard { animation: fade-in-dashboard 0.6s ease-out; }
        .animate-grow-bar { animation: grow-bar 0.8s ease-out; }
      `}</style>
      <div className="min-h-screen w-screen h-screen bg-background text-foreground">
        <div className="grid grid-rows-[72px_1fr] h-full w-full">
          {/* Header */}
          <div className="relative flex items-center px-8 border-b border-border bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-foreground">
              <Image src="/logo.svg" alt="logo" width={64} height={64} />
              <div className="leading-tight">
                <div className="text-base font-bold tracking-wide">STRAVISION</div>
                <div className="text-xs text-muted-foreground">莓界 · 智慧农业平台</div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <PageNavigation />
            </div>

            {/* 布局编辑按钮和连接状态 */}
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
                <span className="text-xs text-muted-foreground/60">
                  更新: {connectionStatus.lastUpdate.toLocaleTimeString()}
                </span>
              )}
              {isEditMode ? (
                <Button
                  onClick={handleSaveLayout}
                  className="h-9 rounded-full px-5 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Save className="mr-2" size={18} /> 保存布局
                </Button>
              ) : (
                <Button
                  onClick={handleEditMode}
                  variant="ghost"
                  className="h-9 rounded-full px-5 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                >
                  <Edit className="mr-2" size={18} /> 编辑布局
                </Button>
              )}
              <UserAvatarMenu user={currentUser} />
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="relative px-8 pb-8 pt-6">
            <div className="w-full">
              <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={80}
                width={typeof window !== 'undefined' ? window.innerWidth - 64 : 1600}
                onLayoutChange={onLayoutChange}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                compactType={null}
                preventCollision={true}
              >
                {/* 湿度 */}
                <div key="humidity">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            {deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'}
                            <span className="text-2xl font-normal text-muted-foreground">%</span>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">湿度</Badge>
                        </div>
                        <Droplets className="size-10 text-blue-400" />
                      </div>
                      <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                        <defs>
                          <linearGradient id="humidity" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path d="M0,40 Q75,30 150,35 T300,30" fill="none" stroke="#60a5fa" strokeWidth="2.5" />
                        <path d="M0,40 Q75,30 150,35 T300,30 L300,60 L0,60 Z" fill="url(#humidity)" />
                      </svg>
                    </CardContent>
                  </Card>
                </div>

                {/* 温度 */}
                <div key="temperature">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            {deviceData ? (deviceData.temperature / 10).toFixed(1) : '--'}
                            <span className="text-2xl font-normal text-muted-foreground">°C</span>
                          </div>
                          <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">温度</Badge>
                        </div>
                        <Sun className="size-10 text-orange-400" />
                      </div>
                      <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                        <defs>
                          <linearGradient id="temp" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path d="M0,45 Q75,35 150,40 T300,35" fill="none" stroke="#fb923c" strokeWidth="2.5" />
                        <path d="M0,45 Q75,35 150,40 T300,35 L300,60 L0,60 Z" fill="url(#temp)" />
                      </svg>
                    </CardContent>
                  </Card>
                </div>

                {/* 光照 */}
                <div key="light">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            {deviceData ? deviceData.light : '--'}
                            <span className="text-2xl font-normal text-muted-foreground">lux</span>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">光照强度</Badge>
                        </div>
                        <Sun className="size-10 text-yellow-400" strokeWidth={1.5} />
                      </div>
                      <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                        <defs>
                          <linearGradient id="light" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#facc15" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#facc15" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path d="M0,50 Q75,25 150,30 T300,20" fill="none" stroke="#facc15" strokeWidth="2.5" />
                        <path d="M0,50 Q75,25 150,30 T300,20 L300,60 L0,60 Z" fill="url(#light)" />
                      </svg>
                    </CardContent>
                  </Card>
                </div>

                {/* CO2 */}
                <div key="co2">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            {deviceData ? deviceData.co2 : '--'}
                            <span className="text-2xl font-normal text-muted-foreground">ppm</span>
                          </div>
                          <Badge className="bg-gray-500/20 text-white/70 border-gray-500/30">CO₂浓度</Badge>
                        </div>
                        <Wind className="size-10 text-gray-500" />
                      </div>
                      <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                        {[60, 75, 50, 85, 65, 70, 55, 80].map((height, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 土壤湿度 */}
                <div key="soilMoisture">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            {deviceData ? (deviceData.earth_water / 10).toFixed(1) : '--'}
                            <span className="text-2xl font-normal text-muted-foreground">%</span>
                          </div>
                          <Badge className="bg-cyan-500/20 text-cyan-600 border-cyan-500/30">土壤湿度</Badge>
                        </div>
                        <Droplets className="size-10 text-cyan-400" />
                      </div>
                      <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                        <defs>
                          <linearGradient id="soilMoisture" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path d="M0,42 Q75,38 150,40 T300,38" fill="none" stroke="#22d3ee" strokeWidth="2.5" />
                        <path d="M0,42 Q75,38 150,40 T300,38 L300,60 L0,60 Z" fill="url(#soilMoisture)" />
                      </svg>
                    </CardContent>
                  </Card>
                </div>

                {/* 土壤肥力 */}
                <div key="fertility">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-5xl font-bold text-foreground mb-2">78.5<span className="text-2xl font-normal text-muted-foreground">%</span></div>
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">土壤肥力</Badge>
                        </div>
                        <Leaf className="size-10 text-green-500" />
                      </div>
                      <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                        <defs>
                          <linearGradient id="fertility" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path d="M0,48 Q75,32 150,38 T300,28" fill="none" stroke="#4ade80" strokeWidth="2.5" />
                        <path d="M0,48 Q75,32 150,38 T300,28 L300,60 L0,60 Z" fill="url(#fertility)" />
                      </svg>
                    </CardContent>
                  </Card>
                </div>

                {/* 氮含量 */}
                <div key="nitrogen">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-4xl font-bold text-foreground mb-2">
                            {deviceData ? deviceData.earth_n : '--'}
                            <span className="text-xl font-normal text-muted-foreground">mg/kg</span>
                          </div>
                          <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">氮含量 (N)</Badge>
                        </div>
                        <div className="size-10 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xl">N</div>
                      </div>
                      <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                        {[55, 70, 60, 75, 65].map((height, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-lg" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 磷含量 */}
                <div key="phosphorus">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-4xl font-bold text-foreground mb-2">
                            {deviceData ? deviceData.earth_p : '--'}
                            <span className="text-xl font-normal text-muted-foreground">mg/kg</span>
                          </div>
                          <Badge className="bg-pink-500/20 text-pink-600 border-pink-500/30">磷含量 (P)</Badge>
                        </div>
                        <div className="size-10 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold text-xl">P</div>
                      </div>
                      <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                        {[50, 65, 55, 70, 60].map((height, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-pink-400 to-pink-300 rounded-t-lg" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 钾含量 */}
                <div key="potassium">
                  <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-4xl font-bold text-foreground mb-2">
                            {deviceData ? deviceData.earth_k : '--'}
                            <span className="text-xl font-normal text-muted-foreground">mg/kg</span>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">钾含量 (K)</Badge>
                        </div>
                        <div className="size-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-xl">K</div>
                      </div>
                      <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                        {[65, 75, 70, 80, 72].map((height, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-lg" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 降雨量 */}
                <div key="rainfall">
                  {(() => {
                    const todayPrecip = weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm || 0
                    const isRaining = todayPrecip > 0

                    return (
                      <Card className={`h-full rounded-3xl border overflow-hidden shadow-2xl transition-all cursor-move relative ${isRaining
                        ? 'bg-gradient-to-br from-blue-600/20 via-cyan-600/15 to-blue-700/20 border-blue-400/30 hover:shadow-blue-500/20'
                        : 'glass border-border hover:shadow-3xl'
                        }`}>
                        {/* 雨滴动画效果 */}
                        {isRaining && (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {Array.from({ length: 15 }).map((_, i) => (
                              <div
                                key={i}
                                className="absolute w-0.5 h-3 bg-blue-300/30 animate-rain-dashboard"
                                style={{
                                  left: `${Math.random() * 100}%`,
                                  animationDelay: `${Math.random() * 2}s`,
                                  animationDuration: `${0.8 + Math.random() * 0.4}s`
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-5xl font-bold text-foreground mb-2 animate-fade-in-dashboard">
                                {weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm?.toFixed(1) || '--'}
                                <span className="text-2xl font-normal text-muted-foreground">mm</span>
                              </div>
                              <Badge className={`${isRaining ? 'bg-blue-400/30 text-blue-200 border-blue-400/40' : 'bg-blue-500/20 text-blue-600 border-blue-500/30'}`}>
                                今日降雨量
                              </Badge>
                            </div>
                            <Droplets className={`size-10 transition-all ${isRaining ? 'text-blue-300 animate-bounce' : 'text-blue-400'}`} />
                          </div>
                          <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                            {weatherData?.forecast?.forecastday?.slice(0, 7).map((day, i) => {
                              const maxPrecip = Math.max(...(weatherData.forecast.forecastday.slice(0, 7).map(d => d.day.totalprecip_mm || 0)), 1)
                              const height = ((day.day.totalprecip_mm || 0) / maxPrecip) * 100
                              const hasRain = (day.day.totalprecip_mm || 0) > 0
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-t-lg transition-all duration-500 ${hasRain
                                    ? 'bg-gradient-to-t from-blue-400 to-blue-300 hover:from-blue-500 hover:to-blue-400 animate-grow-bar'
                                    : 'bg-gradient-to-t from-blue-400/20 to-blue-300/20 hover:from-blue-400/30 hover:to-blue-300/30'
                                    }`}
                                  style={{
                                    height: `${Math.max(height, 5)}%`,
                                    animationDelay: `${i * 0.1}s`
                                  }}
                                  title={`${day.date}: ${day.day.totalprecip_mm?.toFixed(1) || 0}mm`}
                                />
                              )
                            }) || [40, 60, 35, 70, 45, 55, 50].map((height, i) => (
                              <div key={i} className="flex-1 bg-gradient-to-t from-blue-400/30 to-blue-300/30 rounded-t-lg" style={{ height: `${height}%` }} />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </div>

              </GridLayout>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}