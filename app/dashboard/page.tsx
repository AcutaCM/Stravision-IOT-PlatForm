"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
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
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard"
import { SpectralCard } from "@/components/dashboard/spectral-card"
import { IntroDisclosure } from "@/components/ui/intro-disclosure"

const tourSteps = [
  {
    title: "欢迎使用 Stravision",
    short_description: "开启智慧农业新篇章",
    full_description: "Stravision 是您的全栈式智慧农业管理平台。通过融合物联网与人工智能技术，我们为您提供精准的环境监测、智能决策支持和自动化的设备控制。让我们花一分钟了解核心功能。",
    media: {
      type: "image" as const,
      src: "/tour/starter.png",
      alt: "Welcome to Stravision",
    },
  },
  {
    title: "实时环境监测",
    short_description: "全维度的生长环境数据",
    full_description: "仪表盘实时展示空气温湿度、光照、CO2 以及土壤 NPK 等关键指标。数据实时更新，图表清晰直观，帮助您随时掌握作物生长环境。",
    media: {
      type: "video" as const,
      src: "/tour/dashboard.mp4",
      alt: "Dashboard Monitoring",
    },
  },
  {
    title: "自定义布局",
    short_description: "打造您的专属工作台",
    full_description: "点击右上角的'编辑'按钮，您可以自由拖拽、调整各个数据卡片的大小和位置。无论是重点关注光照还是土壤肥力，都能随心定制。",
    media: {
      type: "video" as const,
      src: "/tour/editLayer.mp4",
      alt: "Custom Layout",
    },
  },
  {
    title: "AI 种植顾问",
    short_description: "基于 RAG 技术的智能专家",
    full_description: "遇到种植难题？随时点击顶部的'AI 助手'。无论是病害诊断还是种植建议，我们的 AI 专家都能基于权威知识库为您提供精准解答。",
    media: {
      type: "video" as const,
      src: "/tour/ai.mp4",
      alt: "AI Assistant",
    },
  },
  {
    title: "开始探索",
    short_description: "立即体验智慧种植",
    full_description: "您已经准备好开始使用了！如果需要再次查看此教程，可以在设置中重新开启。现在，尽情探索 Stravision 的强大功能吧。",
    action: {
      label: "开始使用",
      onClick: () => {},
    },
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [isTourOpen, setIsTourOpen] = useState(false)

  // Check if tour should be shown
  useEffect(() => {
    // We can use a slight delay to ensure the UI is loaded
    const timer = setTimeout(() => {
        // The IntroDisclosure component handles localStorage checking internally via featureId
        // But we need to default 'open' to true initially to let the component decide based on storage
        setIsTourOpen(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()

  // Use shared weather data from context
  const { weatherData } = useWeatherContext()

  // Batched history data fetching for optimization
  const [historyDataMap, setHistoryDataMap] = useState<Record<string, any[]>>({})
  
  useEffect(() => {
    const fetchAllHistory = async () => {
        try {
            // List of all types used in the dashboard
            const types = [
                'humidity', 'temperature', 'light', 'co2',
                'soilMoisture', 'fertility', 'nitrogen', 
                'phosphorus', 'potassium', 'rainfall'
            ].join(',')
            
            const res = await fetch(`/api/device-history?types=${types}&range=1h`)
            const data = await res.json()
            if (data.success) {
                setHistoryDataMap(data.data)
            }
        } catch (e) {
            console.error("Failed to fetch dashboard history:", e)
        }
    }
    fetchAllHistory()
  }, [])

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
    { i: "spectral", x: 3, y: 4, w: 6, h: 2 },
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
          <div className="relative px-8 pb-8 pt-6 overflow-y-auto h-full w-full custom-scrollbar">
            <div id="dashboard-charts" className="w-full min-h-full">
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
                  <DashboardChartCard
                    title="湿度"
                    value={deviceData ? deviceData.humidity.toFixed(1) : '--'}
                    unit="%"
                    icon={<Droplets className="size-10 text-blue-400" />}
                    type="humidity"
                    color="blue"
                    gradientColor="#60a5fa"
                    initialHistoryData={historyDataMap['humidity']}
                  />
                </div>

                {/* 温度 */}
                <div key="temperature">
                  <DashboardChartCard
                    title="温度"
                    value={deviceData ? deviceData.temperature.toFixed(1) : '--'}
                    unit="°C"
                    icon={<Sun className="size-10 text-orange-400" />}
                    type="temperature"
                    color="orange"
                    gradientColor="#fb923c"
                    initialHistoryData={historyDataMap['temperature']}
                  />
                </div>

                {/* 光照 */}
                <div key="light">
                  <DashboardChartCard
                    title="光照强度"
                    value={deviceData ? deviceData.light : '--'}
                    unit="lux"
                    icon={<Sun className="size-10 text-yellow-400" strokeWidth={1.5} />}
                    type="light"
                    color="yellow"
                    gradientColor="#facc15"
                    initialHistoryData={historyDataMap['light']}
                  />
                </div>

                {/* CO2 */}
                <div key="co2">
                  <DashboardChartCard
                    title="CO₂浓度"
                    value={deviceData ? deviceData.co2 : '--'}
                    unit="ppm"
                    icon={<Wind className="size-10 text-gray-500" />}
                    type="co2"
                    color="gray"
                    gradientColor="#9ca3af"
                    initialHistoryData={historyDataMap['co2']}
                  />
                </div>

                {/* 土壤湿度 */}
                <div key="soilMoisture">
                  <DashboardChartCard
                    title="土壤湿度"
                    value={deviceData ? (deviceData.earth_water / 10).toFixed(1) : '--'}
                    unit="%"
                    icon={<Droplets className="size-10 text-cyan-400" />}
                    type="soilMoisture"
                    color="cyan"
                    gradientColor="#22d3ee"
                    initialHistoryData={historyDataMap['soilMoisture']}
                  />
                </div>

                {/* 土壤肥力 */}
                <div key="fertility">
                  <DashboardChartCard
                    title="土壤肥力"
                    value={(() => {
                        if (!deviceData) return '--'
                        // Calculate fertility based on NPK values
                        // N: 0-200 mg/kg -> 0-100%
                        const nScore = Math.min(100, (deviceData.earth_n / 200) * 100)
                        // P: 0-100 mg/kg -> 0-100%
                        const pScore = Math.min(100, (deviceData.earth_p / 100) * 100)
                        // K: 0-300 mg/kg -> 0-100%
                        const kScore = Math.min(100, (deviceData.earth_k / 300) * 100)
                        
                        const fertility = (nScore + pScore + kScore) / 3
                        return fertility.toFixed(1)
                    })()}
                    unit="%"
                    icon={<Leaf className="size-10 text-green-500" />}
                    type="fertility"
                    color="green"
                    gradientColor="#4ade80"
                    initialHistoryData={historyDataMap['fertility']}
                  />
                </div>

                {/* 氮含量 */}
                <div key="nitrogen">
                  <DashboardChartCard
                    title="氮含量 (N)"
                    value={deviceData ? deviceData.earth_n : '--'}
                    unit="mg/kg"
                    icon={<div className="size-10 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xl">N</div>}
                    type="nitrogen"
                    color="purple"
                    gradientColor="#c084fc"
                    initialHistoryData={historyDataMap['nitrogen']}
                  />
                </div>

                {/* 磷含量 */}
                <div key="phosphorus">
                  <DashboardChartCard
                    title="磷含量 (P)"
                    value={deviceData ? deviceData.earth_p : '--'}
                    unit="mg/kg"
                    icon={<div className="size-10 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold text-xl">P</div>}
                    type="phosphorus"
                    color="pink"
                    gradientColor="#f472b6"
                    initialHistoryData={historyDataMap['phosphorus']}
                  />
                </div>

                {/* 钾含量 */}
                <div key="potassium">
                  <DashboardChartCard
                    title="钾含量 (K)"
                    value={deviceData ? deviceData.earth_k : '--'}
                    unit="mg/kg"
                    icon={<div className="size-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-xl">K</div>}
                    type="potassium"
                    color="amber"
                    gradientColor="#fbbf24"
                    initialHistoryData={historyDataMap['potassium']}
                  />
                </div>

                {/* 光谱分析 */}
                <div key="spectral">
                  <SpectralCard data={deviceData} />
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
      <IntroDisclosure
        steps={tourSteps}
        open={isTourOpen}
        setOpen={setIsTourOpen}
        featureId="dashboard-tour-v1"
      />
    </>
  )
}
