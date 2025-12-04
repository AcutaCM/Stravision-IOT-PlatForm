"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false })

interface DashboardChartCardProps {
    title: string
    value: string | number
    unit: string
    icon: React.ReactNode
    type: string // API type parameter
    color: string // Tailwind color class prefix (e.g., 'blue', 'orange')
    gradientColor: string // Hex color for chart gradient
    deviceData?: any // Pass realtime data if needed for current value
}

export function DashboardChartCard({
    title,
    value,
    unit,
    icon,
    type,
    color,
    gradientColor,
}: DashboardChartCardProps) {
    const [timeRange, setTimeRange] = useState("1h")
    const [historyData, setHistoryData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/device-history?type=${type}&range=${timeRange}`)
                const data = await res.json()
                if (data.success) {
                    setHistoryData(data.data)
                }
            } catch (error) {
                console.error("Failed to fetch history:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchHistory()
    }, [type, timeRange])

    const getOption = () => {
        return {
            grid: {
                top: 10,
                right: 0,
                bottom: 0,
                left: 0,
                containLabel: false
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    const date = new Date(params[0].value[0])
                    const timeStr = timeRange === '7d'
                        ? `${date.getMonth() + 1}-${date.getDate()}`
                        : `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                    return `${timeStr}<br/>${params[0].value[1]} ${unit}`
                }
            },
            xAxis: {
                type: 'time',
                show: false,
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                show: false,
                min: (value: any) => Math.floor(value.min * 0.9),
            },
            series: [
                {
                    data: historyData.map(item => [item.timestamp, item.value]),
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: {
                        color: gradientColor,
                        width: 2
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: `${gradientColor}66` }, // 40% opacity
                                { offset: 1, color: `${gradientColor}1A` }  // 10% opacity
                            ]
                        }
                    }
                }
            ]
        }
    }

    // Map color prop to specific tailwind classes
    const badgeBg = `bg-${color}-500/20`
    const badgeText = `text-${color}-600`
    const badgeBorder = `border-${color}-500/30`

    return (
        <Card className="h-full rounded-3xl border border-border overflow-hidden shadow-2xl glass hover:shadow-3xl transition-all cursor-move flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-5xl font-bold text-foreground mb-2">
                            {value}
                            <span className="text-2xl font-normal text-muted-foreground ml-1">{unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={`${badgeBg} ${badgeText} ${badgeBorder}`}>
                                {title}
                            </Badge>
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger className="h-6 w-[80px] text-xs bg-transparent border-none focus:ring-0 p-0 text-muted-foreground hover:text-foreground">
                                    <SelectValue placeholder="Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1h">1 小时</SelectItem>
                                    <SelectItem value="1d">1 天</SelectItem>
                                    <SelectItem value="7d">7 天</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {icon}
                </div>

                <div className="h-16 w-full relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ReactECharts
                            option={getOption()}
                            style={{ height: '100%', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
