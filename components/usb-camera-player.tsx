"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { AlertCircle } from "lucide-react"

interface USBCameraPlayerProps {
    className?: string
    id?: string
    autoPlay?: boolean
    muted?: boolean
    mirror?: boolean
}

type Detection = {
  box: [number, number, number, number]
  conf: number
  class: number
  label: string
}

export function USBCameraPlayer({
    className,
    id,
    autoPlay = true,
    muted = true,
    mirror = false
}: USBCameraPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    
    const [error, setError] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isStreaming, setIsStreaming] = useState(false)

    const drawDetections = useCallback((detections: Detection[]) => {
        const canvas = canvasRef.current
        const video = videoRef.current
        if (!canvas || !video) return
    
        const ctx = canvas.getContext('2d')
        if (!ctx) return
    
        // Match canvas size to video size
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
    
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    
        // Draw detections
        detections.forEach(det => {
          const [x1, y1, x2, y2] = det.box
          const label = `${det.label} ${(det.conf * 100).toFixed(1)}%`
    
          // Draw box
          ctx.strokeStyle = '#00FF00'
          ctx.lineWidth = 2
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    
          // Draw label background
          ctx.fillStyle = '#00FF00'
          const textWidth = ctx.measureText(label).width
          ctx.fillRect(x1, y1 - 20, textWidth + 10, 20)
    
          // Draw label text
          ctx.fillStyle = '#000000'
          ctx.font = '14px Arial'
          ctx.fillText(label, x1 + 5, y1 - 5)
        })
    }, [])

    useEffect(() => {
        let mounted = true
        let timeoutId: NodeJS.Timeout
        let freezeCheckInterval: NodeJS.Timeout
        let lastTime = 0
        let freezeCount = 0

        const startCamera = async () => {
            // Debounce slightly to avoid React Strict Mode double-mount race conditions
            // which can cause camera resource locking on Windows
            await new Promise(resolve => {
                timeoutId = setTimeout(resolve, 100)
            })

            if (!mounted) return

            try {
                setError(null)
                
                // Stop existing stream if any
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop())
                    streamRef.current = null
                }

                console.log("[USBCamera] Requesting stream...")
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        // facingMode: "user" // Not always applicable for USB webcams
                    },
                    audio: false
                })

                if (!mounted) {
                    console.log("[USBCamera] Unmounted after stream received, stopping tracks.")
                    mediaStream.getTracks().forEach(track => track.stop())
                    return
                }

                console.log("[USBCamera] Stream received, playing.")
                streamRef.current = mediaStream
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream
                    try {
                        await videoRef.current.play()
                        setIsStreaming(true)
                    } catch (e) {
                        console.error("[USBCamera] Play failed:", e)
                    }
                }
            } catch (err: any) {
                if (!mounted) return
                console.error("Error accessing camera:", err)
                setError(err.message || "无法访问摄像头，请检查权限设置")
                setIsStreaming(false)
            }
        }

        startCamera()

        // Watchdog to detect freezing
        freezeCheckInterval = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                const currentTime = videoRef.current.currentTime
                if (currentTime === lastTime) {
                    freezeCount++
                    if (freezeCount > 3) { // Frozen for 3 checks (approx 3s)
                         console.log("[USBCamera] Stream frozen detected, restarting...")
                         freezeCount = 0
                         startCamera()
                    }
                } else {
                    freezeCount = 0
                    lastTime = currentTime
                }
            }
        }, 1000)

        return () => {
            mounted = false
            clearTimeout(timeoutId)
            clearInterval(freezeCheckInterval)
            console.log("[USBCamera] Cleanup triggered.")
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
                streamRef.current = null
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null
            }
            setIsStreaming(false)
        }
    }, [])

    // AI Inference WebSocket Connection
    useEffect(() => {
        // Connect to WebSocket Server (FastAPI defaults to 8000 and endpoint /ws)
        let wsUrl: string
        if (process.env.NODE_ENV === 'development') {
          wsUrl = "ws://localhost:8000/ws"
        } else {
          // Use relative path /inference/ws handled by Nginx
          // Construct absolute URL based on current location protocol
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${protocol}//${window.location.host}/inference/ws`
        }

        const ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log("Connected to inference server")
          setIsConnected(true)
        }
    
        ws.onclose = () => {
          console.log("Disconnected from inference server")
          setIsConnected(false)
        }
    
        ws.onerror = () => {
          // Don't show main error, just console log, as AI is optional enhancement
          console.log("Inference server connection error (AI features disabled)")
        }
    
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as { detections?: Detection[] }
            if (data.detections) {
              drawDetections(data.detections)
            }
          } catch (e) {
            console.error("Error parsing message:", e)
          }
        }
    
        wsRef.current = ws
    
        return () => {
          ws.close()
        }
    }, [drawDetections])

    // Frame sending loop
    useEffect(() => {
        if (!isStreaming || !isConnected) return
    
        const sendFrame = () => {
          if (videoRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const video = videoRef.current
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              // Compress to JPEG 0.5 quality to reduce bandwidth
              const base64Data = canvas.toDataURL('image/jpeg', 0.5)
              wsRef.current.send(base64Data)
            }
          }
        }
    
        // Send frames every 100ms (10 FPS)
        const intervalId = setInterval(sendFrame, 100)
    
        return () => clearInterval(intervalId)
    }, [isStreaming, isConnected])

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center bg-black/90 text-white p-4 ${className}`}>
                <AlertCircle className="size-8 text-red-500 mb-2" />
                <p className="text-sm text-center">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-white/10 rounded-full text-xs hover:bg-white/20 transition-colors"
                >
                    重试
                </button>
            </div>
        )
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <video
                ref={videoRef}
                id={id}
                className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                autoPlay={autoPlay}
                muted={muted}
                playsInline
            />
            <canvas 
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${mirror ? 'scale-x-[-1]' : ''}`}
            />
             {/* Status Overlay */}
             <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
                <div className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md transition-colors duration-300 ${isConnected ? 'bg-green-500/80 text-white' : 'bg-gray-500/50 text-gray-200'}`}>
                  {isConnected ? "AI 智能识别中" : "AI 服务未连接"}
                </div>
            </div>
        </div>
    )
}
