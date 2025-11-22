"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudDrizzle,
  Wind,
  Droplets,
  Gauge,
  Eye,
} from "lucide-react"
import { motion } from "framer-motion"
import { useWeatherContext } from "@/lib/contexts/weather-context"

interface DeviceData {
  temperature: number
  humidity: number
  light: number
  co2: number
  earth_temp: number
  earth_water: number
  earth_ec: number
  earth_n: number
  earth_p: number
  earth_k: number
  relay5: number
  relay6: number
  relay7: number
  relay8: number
  led1: number
  led2: number
  led3: number
  led4: number
  timestamp?: number
}

interface WeatherCardProps {
  deviceData?: DeviceData | null
}

const weatherIcons = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
}

export function WeatherCard({ deviceData }: WeatherCardProps) {
  const { weatherData, loading, error } = useWeatherContext()
  
  // Map weather condition codes to our icon types
  const getWeatherIcon = (code: number): "sun" | "cloud" | "rain" | "snow" => {
    // WeatherAPI.com condition codes
    if (code === 1000) return 'sun' // Sunny/Clear
    if ([1003, 1006, 1009].includes(code)) return 'cloud' // Cloudy
    if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return 'rain' // Rain
    if ([1066, 1114, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return 'snow' // Snow
    return 'cloud'
  }
  
  // Get forecast data from API or use defaults
  const forecast = weatherData?.forecast?.forecastday?.slice(0, 7).map((day, index) => ({
    date: index === 0 ? '今天' : index === 1 ? '明天' : new Date(day.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    icon: getWeatherIcon(day.day.condition.code),
    temp: Math.round(day.day.avgtemp_c),
    humidity: day.day.avghumidity
  })) || []
  
  // Temperature curve data
  const tempData = forecast.map(f => f.temp)
  const maxTemp = tempData.length > 0 ? Math.max(...tempData) : 25
  const minTemp = tempData.length > 0 ? Math.min(...tempData) : 15

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          环境多维感知数据
          <span className="text-white/50">›</span>
        </h3>
      </div>

      {/* 当前环境数据 */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20"
        >
          <div className="text-orange-200/70 text-sm mb-1">温度</div>
          <div className="text-3xl font-bold text-white">
            {deviceData ? (deviceData.temperature / 10).toFixed(1) : '--'}
            <span className="text-lg text-white/70 ml-1">°C</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20"
        >
          <div className="text-blue-200/70 text-sm mb-1">湿度</div>
          <div className="text-3xl font-bold text-white">
            {deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'}
            <span className="text-lg text-white/70 ml-1">%</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/10 border border-gray-500/20"
        >
          <div className="text-gray-200/70 text-sm mb-1">二氧化碳</div>
          <div className="text-3xl font-bold text-white">
            {deviceData ? deviceData.co2 : '--'}
            <span className="text-lg text-white/70 ml-1">ppm</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/20"
        >
          <div className="text-yellow-200/70 text-sm mb-1">光照</div>
          <div className="text-3xl font-bold text-white">
            {deviceData ? deviceData.light : '--'}
            <span className="text-lg text-white/70 ml-1">lux</span>
          </div>
        </motion.div>
      </div>

      {/* 天气预报卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-blue-400/30 overflow-hidden">
          <CardContent className="p-6 space-y-4">
            {/* 当前天气和定位 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
              {loading ? (
                <div className="text-white/50">加载中...</div>
              ) : error ? (
                <div className="text-red-400 text-sm">天气数据加载失败</div>
              ) : weatherData?.current ? (
                <>
                  {(() => {
                    const Icon = weatherIcons[getWeatherIcon(weatherData.current.condition.code)]
                    return <Icon className="size-12 text-white" strokeWidth={1.5} />
                  })()}
                  <div>
                    <div className="text-4xl font-bold text-white">
                      {Math.round(weatherData.current.temp_c)}°C
                    </div>
                    <div className="text-sm text-white/70 mt-1">
                      {weatherData.current.condition.text}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Cloud className="size-12 text-white" strokeWidth={1.5} />
                  <div>
                    <div className="text-4xl font-bold text-white">--°C</div>
                  </div>
                </>
              )}
              </div>
              {/* 定位信息 */}
              {weatherData?.location && (
                <div className="text-right">
                  <div className="text-xl font-medium text-white">
                    {weatherData.location.name === 'Ningbo' ? '宁波' : weatherData.location.name}
                  </div>
                  <div className="text-sm text-white/60">
                    {weatherData.location.region === 'Zhejiang' ? '浙江' : weatherData.location.region}
                  </div>
                </div>
              )}
            </div>

            {/* 7天预报 - 日期和图标 */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {forecast.length > 0 ? forecast.map((day, i) => {
                const Icon = weatherIcons[day.icon]
                return (
                  <div key={i} className="space-y-2">
                    <div className="text-xs text-white/70 font-medium">{day.date}</div>
                    <Icon className="size-5 text-white mx-auto" strokeWidth={1.5} />
                  </div>
                )
              }) : (
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-xs text-white/70">--</div>
                    <Cloud className="size-5 text-white/30 mx-auto" strokeWidth={1.5} />
                  </div>
                ))
              )}
            </div>

            {/* 温度曲线 - 与上下对齐 */}
            <div className="relative h-28">
              {tempData.length > 1 ? (
                <div className="w-full h-full">
                  <svg viewBox="0 0 700 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="tempGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(96, 165, 250, 0.4)" />
                        <stop offset="100%" stopColor="rgba(96, 165, 250, 0.05)" />
                      </linearGradient>
                    </defs>
                    {/* 绘制曲线和填充区域 */}
                    {(() => {
                      const range = maxTemp - minTemp || 1
                      const padding = 25 // 上下留白
                      
                      // 计算每个点的位置，使其与列对齐
                      const points = tempData.map((temp, i) => {
                        // 计算 x 坐标：每列中心位置
                        const columnWidth = 700 / tempData.length
                        const x = columnWidth * i + columnWidth / 2
                        // 计算 y 坐标
                        const y = padding + ((maxTemp - temp) / range) * (100 - padding * 2)
                        return { x, y, temp }
                      })
                      
                      // 构建路径
                      const linePath = points.map((p, i) => 
                        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                      ).join(' ')
                      
                      const areaPath = `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
                      
                      return (
                        <>
                          {/* 填充区域 */}
                          <path d={areaPath} fill="url(#tempGradient)" />
                          {/* 曲线 */}
                          <path d={linePath} fill="none" stroke="rgba(96, 165, 250, 0.9)" strokeWidth="2" />
                          {/* 数据点和温度标签 */}
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill="white" />
                              <text 
                                x={p.x} 
                                y={p.y - 12} 
                                textAnchor="middle" 
                                fill="white" 
                                fontSize="16"
                                fontWeight="600"
                                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                              >
                                {p.temp}°
                              </text>
                            </g>
                          ))}
                        </>
                      )
                    })()}
                  </svg>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white/30 text-sm">
                  等待天气数据...
                </div>
              )}
            </div>

            {/* 湿度 - 与上方对齐 */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {weatherData?.forecast?.forecastday?.slice(0, 7).map((day, i) => (
                <div key={i} className="space-y-1">
                  <Droplets className="size-4 text-blue-300 mx-auto" />
                  <div className="text-xs text-white/90">{day.day.avghumidity}%</div>
                </div>
              )) || Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Droplets className="size-4 text-blue-300/30 mx-auto" />
                  <div className="text-xs text-white/50">--</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 详细环境数据 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "室外温度", value: "25.3°C", icon: Sun },
          { label: "西风向", value: "中等", icon: Wind },
          { label: "UV", value: "紫外线", icon: Sun },
          { label: "室外湿度", value: "25.3%", icon: Droplets },
          { label: "室外风力", value: "1级", icon: Wind },
          { label: "室外气压", value: "581hPa", icon: Gauge },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            className="p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="size-4 text-white/70" />
              <div className="text-xs text-white/60">{item.label}</div>
            </div>
            <div className="text-lg font-bold text-white">{item.value}</div>
          </motion.div>
        ))}
      </div>

      {/* 生长阶段 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30"
      >
        <div className="text-sm text-green-200/70 mb-3">草莓生长阶段</div>
        <div className="flex items-center justify-between">
          {["🌱", "🌿", "🌸", "🍓", "🍓"].map((emoji, i) => (
            <div
              key={i}
              className={`text-3xl transition-all ${
                i <= 3 ? "opacity-100 scale-110" : "opacity-40"
              }`}
            >
              {emoji}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-green-200/70">
          当前阶段：开花结果期
        </div>
      </motion.div>
    </div>
  )
}
