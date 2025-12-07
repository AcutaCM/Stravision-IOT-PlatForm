"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { 
  Camera, 
  Video, 
  VideoOff, 
  Settings2, 
  Upload, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Cpu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner" // Assuming sonner or similar is used, or I'll use alert/custom toast

interface SmartCameraSystemProps {
  className?: string
}

type Detection = {
  box: [number, number, number, number]
  conf: number
  class: number
  label: string
}

export function SmartCameraSystem({ className }: SmartCameraSystemProps) {
  // Camera & Canvas Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // State
  const [isStreaming, setIsStreaming] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [currentModel, setCurrentModel] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [fps, setFps] = useState(0)
  
  // FPS Calculation
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(Date.now())

  // Fetch models
  const fetchModels = useCallback(async () => {
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? "http://localhost:8000" 
        : "/inference"
      const res = await fetch(`${baseUrl}/models`)
      if (res.ok) {
        const data = await res.json()
        setModels(data.available_models)
        setCurrentModel(data.current_model || (data.available_models[0] || ""))
      }
    } catch (e) {
      console.error("Failed to fetch models:", e)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Change Model
  const handleModelChange = async (modelName: string) => {
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? "http://localhost:8000" 
        : "/inference"
      const res = await fetch(`${baseUrl}/models/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName })
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentModel(data.current_model)
        // toast.success("模型已切换")
      } else {
        // toast.error("切换模型失败")
      }
    } catch (e) {
      console.error("Error switching model:", e)
    }
  }

  // Upload Model
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append("file", file)

    setIsUploading(true)
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? "http://localhost:8000" 
        : "/inference"
      const res = await fetch(`${baseUrl}/models/upload`, {
        method: "POST",
        body: formData
      })
      
      if (res.ok) {
        await fetchModels()
        // toast.success("模型上传成功")
      } else {
        const err = await res.json()
        alert(`上传失败: ${err.detail}`)
      }
    } catch (e) {
      console.error("Upload error:", e)
      alert("上传出错")
    } finally {
      setIsUploading(false)
    }
  }

  // Camera Control
  const startCamera = async () => {
    try {
      setError(null)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsStreaming(true)
      }
    } catch (err: any) {
      console.error("Camera error:", err)
      setError("无法访问摄像头，请检查权限")
      setIsStreaming(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
    setAiEnabled(false)
  }

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = () => {
        let wsUrl: string
        if (process.env.NODE_ENV === 'development') {
          wsUrl = "ws://localhost:8000/ws"
        } else {
          // Use relative path /inference/ws handled by Nginx
          // Construct absolute URL based on current location protocol
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${protocol}//${window.location.host}/inference/ws`
        }
        
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          setIsConnected(true)
        }
    
        ws.onclose = () => {
          setIsConnected(false)
          // Reconnect after 3s
          reconnectTimer = setTimeout(connectWs, 3000)
        }
    
        ws.onerror = (e) => {
          console.log("WS Error", e)
        }
    
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.detections) {
              drawDetections(data.detections)
              
              // FPS Counter
              frameCountRef.current++
              const now = Date.now()
              if (now - lastFpsTimeRef.current >= 1000) {
                setFps(frameCountRef.current)
                frameCountRef.current = 0
                lastFpsTimeRef.current = now
              }
            }
          } catch (e) {
            console.error("Parse error", e)
          }
        }
        
        wsRef.current = ws
    }

    connectWs()

    return () => {
      if (ws) ws.close()
      clearTimeout(reconnectTimer)
    }
  }, [])

  // Draw Detections
  const drawDetections = useCallback((detections: Detection[]) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    detections.forEach(det => {
      const [x1, y1, x2, y2] = det.box
      const label = `${det.label} ${Math.round(det.conf * 100)}%`

      // Stylish Box
      ctx.strokeStyle = '#00ff9d' // Neon Green
      ctx.lineWidth = 2
      ctx.shadowColor = '#00ff9d'
      ctx.shadowBlur = 10
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      ctx.shadowBlur = 0

      // Label Background
      ctx.font = 'bold 14px sans-serif'
      const textMetrics = ctx.measureText(label)
      const textHeight = 24
      const textWidth = textMetrics.width + 16

      ctx.fillStyle = 'rgba(0, 255, 157, 0.9)'
      ctx.beginPath()
      ctx.roundRect(x1, y1 - textHeight - 4, textWidth, textHeight, 4)
      ctx.fill()

      // Label Text
      ctx.fillStyle = '#000000'
      ctx.fillText(label, x1 + 8, y1 - 8)
    })
  }, [])

  // Frame Sending Loop
  useEffect(() => {
    if (!isStreaming || !aiEnabled || !isConnected) return

    const sendFrame = () => {
      if (videoRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const video = videoRef.current
        // Create temp canvas to compress image
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
            ctx.drawImage(video, 0, 0)
            // Send as JPEG 0.6 quality
            const base64 = canvas.toDataURL('image/jpeg', 0.6)
            wsRef.current.send(base64)
        }
      }
    }

    const interval = setInterval(sendFrame, 100) // 10 FPS target
    return () => clearInterval(interval)
  }, [isStreaming, aiEnabled, isConnected])


  return (
    <div className={`relative w-full h-full bg-black group overflow-hidden ${className}`}>
        {/* Video Layer */}
        <video 
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
        />
        
        {/* Canvas Layer */}
        <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Top Control Bar (Overlay) */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-20 transition-transform duration-300 translate-y-[-100%] group-hover:translate-y-0 opacity-0 group-hover:opacity-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
                 {/* Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                    {isConnected ? (
                         <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-medium text-green-400">AI 在线</span>
                         </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <AlertCircle className="size-3 text-red-500" />
                            <span className="text-xs font-medium text-red-500">AI 离线</span>
                        </div>
                    )}
                    <Separator orientation="vertical" className="h-3 bg-white/20" />
                    <span className="text-xs text-white/70">FPS: {fps}</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Select value={currentModel} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-black/40 border-white/10 text-white backdrop-blur-md focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 text-white">
                        {models.map(m => (
                            <SelectItem key={m} value={m} className="text-xs focus:bg-white/20 focus:text-white">
                                {m}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-black/40 border border-white/10 text-white hover:bg-white/20 backdrop-blur-md">
                            <Upload className="size-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>上传新模型</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>模型文件 (.pt / .onnx)</Label>
                                <Input 
                                    type="file" 
                                    accept=".pt,.onnx" 
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                            </div>
                            {isUploading && <p className="text-sm text-muted-foreground">上传中...</p>}
                        </div>
                    </DialogContent>
                </Dialog>

                <Button 
                    variant={isStreaming ? "destructive" : "default"}
                    size="sm"
                    onClick={isStreaming ? stopCamera : startCamera}
                    className="h-8 gap-2 text-xs"
                >
                    {isStreaming ? <VideoOff className="size-3.5" /> : <Video className="size-3.5" />}
                    {isStreaming ? "关闭" : "开启"}
                </Button>
            </div>
        </div>

        {/* Center Placeholder */}
        {!isStreaming && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 flex-col gap-4 bg-black/90 z-10">
                <div className="p-4 rounded-full bg-white/5 border border-white/10 animate-pulse">
                    <Camera className="size-8" />
                </div>
                <p className="text-sm font-medium">点击上方按钮开启智能终端</p>
                <Button variant="outline" size="sm" onClick={startCamera} className="bg-white/10 border-white/10 text-white hover:bg-white/20">
                    启动摄像头
                </Button>
            </div>
        )}

            {/* Error Placeholder */}
            {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-400 flex-col gap-4 bg-black/90 z-20">
                <AlertCircle className="size-10" />
                <p>{error}</p>
                <Button variant="secondary" size="sm" onClick={startCamera} className="pointer-events-auto">
                    重试
                </Button>
            </div>
        )}

        {/* Bottom AI Toggle (Floating) */}
        {isStreaming && (
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-full gap-2 px-6 h-10 backdrop-blur-xl border transition-all shadow-lg ${
                        aiEnabled 
                        ? 'bg-primary/80 border-primary text-primary-foreground hover:bg-primary/90' 
                        : 'bg-black/40 border-white/20 text-white hover:bg-white/20'
                    }`}
                    onClick={() => setAiEnabled(!aiEnabled)}
                >
                    <SparklesIcon className={`size-4 ${aiEnabled ? 'animate-pulse' : ''}`} />
                    {aiEnabled ? "AI 识别运行中" : "开启 AI 识别"}
                </Button>
            </div>
        )}
        
        {/* Detection Overlay Info (Optional, maybe bottom left) */}
        {aiEnabled && isConnected && (
             <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
                {/* Could add more stats here */}
             </div>
        )}
    </div>
  )
}

function SparklesIcon(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M9 3v4" />
        <path d="M3 5h4" />
        <path d="M3 9h4" />
      </svg>
    )
  }
