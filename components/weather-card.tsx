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
import { usePlantGrowth } from "@/lib/hooks/use-plant-growth"

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
  const { weatherData, loading, error, locationSource, requestLocation } = useWeatherContext()
  const { plantData } = usePlantGrowth()

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
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          环境多维感知数据
          <span className="text-muted-foreground">›</span>
        </h3>
      </div>

      {/* 当前环境数据 */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-600/10 border border-orange-500/20"
        >
          <div className="text-orange-700/70 dark:text-orange-200/70 text-sm mb-1">温度</div>
          <div className="text-3xl font-bold text-orange-950 dark:text-white">
            {deviceData ? (deviceData.temperature / 10).toFixed(1) : '--'}
            <span className="text-lg text-orange-900/70 dark:text-white/70 ml-1">°C</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 border border-blue-500/20"
        >
          <div className="text-blue-700/70 dark:text-blue-200/70 text-sm mb-1">湿度</div>
          <div className="text-3xl font-bold text-blue-950 dark:text-white">
            {deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'}
            <span className="text-lg text-blue-900/70 dark:text-white/70 ml-1">%</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-br from-gray-500/10 to-gray-600/5 dark:from-gray-500/20 dark:to-gray-600/10 border border-gray-500/20"
        >
          <div className="text-gray-700/70 dark:text-gray-200/70 text-sm mb-1">二氧化碳</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {deviceData ? deviceData.co2 : '--'}
            <span className="text-lg text-gray-800/70 dark:text-white/70 ml-1">ppm</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 dark:from-yellow-500/20 dark:to-yellow-600/10 border border-yellow-500/20"
        >
          <div className="text-yellow-700/70 dark:text-yellow-200/70 text-sm mb-1">光照</div>
          <div className="text-3xl font-bold text-yellow-950 dark:text-white">
            {deviceData ? deviceData.light : '--'}
            <span className="text-lg text-yellow-900/70 dark:text-white/70 ml-1">lux</span>
          </div>
        </motion.div>
      </div>

      {/* 天气预报卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 dark:from-blue-500/30 dark:to-blue-600/20 border-blue-400/30 overflow-hidden">
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
                      return <Icon className="size-12 text-blue-600 dark:text-white" strokeWidth={1.5} />
                    })()}
                    <div>
                      <div className="text-4xl font-bold text-blue-950 dark:text-white">
                        {Math.round(weatherData.current.temp_c)}°C
                      </div>
                      <div className="text-sm text-blue-800/70 dark:text-white/70 mt-1">
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
                <div
                  className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={requestLocation}
                  title="点击重新定位"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xl font-medium text-blue-950 dark:text-white">
                      {weatherData.location.name === 'Ningbo' ? '宁波' : weatherData.location.name}
                    </span>
                    {locationSource && (
                      <span
                        className="text-base"
                        title={
                          locationSource === 'gps' ? 'GPS定位' :
                            locationSource === 'ip' ? 'IP定位' :
                              '默认位置'
                        }
                      >
                        {locationSource === 'gps' ? '🎯' : locationSource === 'ip' ? '🌐' : '📍'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-blue-800/60 dark:text-white/60">
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
                    <div className="text-xs text-blue-900/70 dark:text-white/70 font-medium">{day.date}</div>
                    <Icon className="size-5 text-blue-700 dark:text-white mx-auto" strokeWidth={1.5} />
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
                                fill="currentColor"
                                className="text-blue-900 dark:text-white"
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
                  <Droplets className="size-4 text-blue-500 dark:text-blue-300 mx-auto" />
                  <div className="text-xs text-blue-900/90 dark:text-white/90">{day.day.avghumidity}%</div>
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
        {(() => {
          const outdoorData = weatherData?.current ? [
            {
              label: "室外温度",
              value: `${Math.round(weatherData.current.temp_c)}°C`,
              icon: Sun
            },
            {
              label: weatherData.current.wind_dir ? `${weatherData.current.wind_dir}风向` : "风向",
              value: weatherData.current.wind_kph < 12 ? "微风" :
                weatherData.current.wind_kph < 30 ? "中等" :
                  weatherData.current.wind_kph < 50 ? "强风" : "大风",
              icon: Wind
            },
            {
              label: "UV",
              value: weatherData.current.uv >= 6 ? "强" :
                weatherData.current.uv >= 3 ? "中等" : "弱",
              icon: Sun
            },
            {
              label: "室外湿度",
              value: `${weatherData.current.humidity}%`,
              icon: Droplets
            },
            {
              label: "室外风力",
              value: `${Math.round(weatherData.current.wind_kph)}km/h`,
              icon: Wind
            },
            {
              label: "室外气压",
              value: `${Math.round(weatherData.current.pressure_mb)}hPa`,
              icon: Gauge
            },
          ] : [
            { label: "室外温度", value: "--", icon: Sun },
            { label: "风向", value: "--", icon: Wind },
            { label: "UV", value: "--", icon: Sun },
            { label: "室外湿度", value: "--", icon: Droplets },
            { label: "室外风力", value: "--", icon: Wind },
            { label: "室外气压", value: "--", icon: Gauge },
          ];

          return outdoorData.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="p-3 rounded-lg bg-secondary/50 dark:bg-white/5 border border-border dark:border-white/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="size-4 text-muted-foreground dark:text-white/70" />
                <div className="text-xs text-muted-foreground dark:text-white/60">{item.label}</div>
              </div>
              <div className="text-lg font-bold text-foreground dark:text-white">{item.value}</div>
            </motion.div>
          ));
        })()}
      </div>

      {/* 生长阶段 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-500/30"
      >
        <div className="text-sm text-green-800/70 dark:text-green-200/70 mb-3">草莓生长阶段</div>
        <div className="flex items-center justify-between">
          {["🌱", "🌿", "🌸", "🍓", "🍓"].map((emoji, i) => {
            const stage = i + 1
            const isActive = plantData && stage <= plantData.stage
            const isCurrent = plantData && stage === plantData.stage
            return (
              <div
                key={i}
                className={`text-3xl transition-all ${isActive
                    ? isCurrent
                      ? "opacity-100 scale-125 drop-shadow-lg"
                      : "opacity-100 scale-110"
                    : "opacity-40 scale-100"
                  }`}
              >
                {emoji}
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-xs text-green-800/70 dark:text-green-200/70">
          当前阶段：{plantData ? (
            ['幼苗期', '生长期', '花芽分化期', '开花结果期', '果实成熟期', '采收后期'][plantData.stage - 1] || `第${plantData.stage}阶段`
          ) : '等待数据...'}
        </div>
        {plantData?.healthScore && (
          <div className="mt-2 flex items-center gap-2">
            <div className="text-xs text-green-800/70 dark:text-green-200/70">健康度：</div>
            <div className="flex-1 h-2 bg-green-900/20 dark:bg-green-100/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${plantData.healthScore}%` }}
              />
            </div>
            <div className="text-xs font-bold text-green-800 dark:text-green-200">{plantData.healthScore}</div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
