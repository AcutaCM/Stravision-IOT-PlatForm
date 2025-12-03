"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Camera, RefreshCw, StopCircle, PlayCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Detection {
  x: number
  y: number
  w: number
  h: number
  score: number
  classId: number
  label: string
}

const MODELS = [
  { id: 'disease', name: '病害检测 (Disease)', path: '/models/disease.onnx' },
  { id: 'mature', name: '成熟度检测 (Maturity)', path: '/models/mature.onnx' }
]

interface AiCameraViewProps {
  className?: string
  selectedModelId?: string
}

declare global {
  interface Window {
    YOLODetector: any;
    ort: any;
  }
}

export function AiCameraView({ className, selectedModelId }: AiCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectorRef = useRef<any>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState("") // Track specific loading state
  const [currentModel, setCurrentModel] = useState(() => 
    MODELS.find(m => m.id === selectedModelId) || MODELS[0]
  )
  const [detections, setDetections] = useState<Detection[]>([])
  const [inferenceTime, setInferenceTime] = useState(0)
  const requestRef = useRef<number>(null)
  const [error, setError] = useState<string | null>(null)
  const isProcessing = useRef(false)
  const lastInferenceTime = useRef(0)

  // 1. Sync model selection
  useEffect(() => {
    if (selectedModelId && selectedModelId !== 'live') {
      const newModel = MODELS.find(m => m.id === selectedModelId)
      if (newModel) {
        setCurrentModel(newModel)
        if (window.ort && window.YOLODetector) {
           initDetector(newModel.path)
        }
      }
    } else {
      // Live mode: stop detector but keep scripts ready
      setModelLoaded(false)
    }
  }, [selectedModelId])

  // 2. Initial Script Loading Check
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let attempts = 0;
    
    const checkScriptsAndInit = () => {
      // Check if scripts are loaded
      if (window.ort && window.YOLODetector) {
        console.log("Scripts loaded successfully");
        setLoadingProgress("脚本加载完成，初始化模型...");
        
        // If we have a model selected, init it now
        if (selectedModelId && selectedModelId !== 'live') {
           initDetector(currentModel.path);
        }
        return true;
      }
      
      attempts++;
      if (attempts > 20) { // 10 seconds timeout
          console.warn("Scripts loading timed out. Current status:", { ort: !!window.ort, YOLODetector: !!window.YOLODetector });
          setLoadingProgress("脚本加载超时，请刷新页面");
          return true; // Stop checking
      }
      return false;
    };

    // Check immediately
    setLoadingProgress("等待 AI 引擎加载...");
    if (!checkScriptsAndInit()) {
      interval = setInterval(() => {
        if (checkScriptsAndInit()) {
          clearInterval(interval);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
      stopCamera();
    };
  }, []); // Run once on mount

  const initDetector = async (modelPath: string) => {
    if (detectorRef.current && detectorRef.current.modelPath === modelPath) {
        setModelLoaded(true)
        setLoadingProgress("");
        return
    }

    setModelLoaded(false)
    setLoadingProgress(`正在加载模型: ${modelPath.split('/').pop()}...`);
    console.log("Initializing detector with:", modelPath)
    
    try {
      if (!window.YOLODetector) {
        throw new Error("YOLODetector script not loaded");
      }

      // Use a timeout to allow UI to update before blocking main thread with WASM compilation
      await new Promise(r => setTimeout(r, 100));

      const detector = new window.YOLODetector(modelPath)
      const success = await detector.init()
      
      if (success) {
        detectorRef.current = detector
        setModelLoaded(true)
        setLoadingProgress("");
        console.log("Detector initialized successfully")
      } else {
        console.error("Detector init returned false")
        setError("模型加载失败")
        setLoadingProgress("模型加载失败");
      }
    } catch (e) {
      console.error("Init error:", e)
      setError("初始化错误")
      setLoadingProgress("初始化错误");
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsStreaming(true)
          drawLoop()
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("无法访问摄像头，请确保已授予权限。")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsStreaming(false)
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }

  const drawLoop = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Draw detections
    detections.forEach(det => {
      const { x, y, w, h, label, score, classId } = det
      const color = currentModel.id === 'disease' 
        ? (classId === 0 ? '#00ff00' : '#ff0000')
        : (classId === 1 ? '#00ff00' : '#ffff00')
      
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, w, h)
      
      ctx.fillStyle = color
      ctx.font = 'bold 16px Arial'
      const text = `${label} ${(score * 100).toFixed(0)}%`
      const textWidth = ctx.measureText(text).width
      ctx.fillRect(x, y - 24, textWidth + 8, 24)
      ctx.fillStyle = '#000'
      ctx.fillText(text, x + 4, y - 6)
    })

    // Run inference
    const shouldRun = modelLoaded && !isProcessing.current && selectedModelId && selectedModelId !== 'live' && detectorRef.current
    
    if (shouldRun && (Date.now() - lastInferenceTime.current > 100)) {
      isProcessing.current = true
      const start = Date.now()
      
      try {
        const results = await detectorRef.current.detect(video)
        setDetections(results)
        setInferenceTime(Date.now() - start)
      } catch (e) {
        console.error("Inference error:", e)
      }
      
      lastInferenceTime.current = Date.now()
      isProcessing.current = false
    }

    requestRef.current = requestAnimationFrame(drawLoop)
  }, [detections, modelLoaded, currentModel, selectedModelId])

  return (
    <div className={`relative rounded-3xl overflow-hidden bg-black ${className}`}>
      <div className="relative w-full h-full">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
        
        {!isStreaming && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <div className="mx-auto size-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Camera className="size-8 text-primary animate-pulse" />
              </div>
              <p className="text-white/80">点击开启摄像头进行 AI 识别</p>
              <Button onClick={startCamera} size="lg" className="rounded-full">
                <PlayCircle className="mr-2 size-5" />
                开启摄像头
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 backdrop-blur-sm">
             <p className="text-red-200">{error}</p>
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
          {selectedModelId !== 'live' && (
             <Badge variant="secondary" className="bg-black/50 backdrop-blur text-white border-white/20">
               {modelLoaded ? 'AI 就绪' : (loadingProgress || '加载中...')}
             </Badge>
          )}
          {isStreaming && (
             <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
               FPS: {inferenceTime > 0 ? Math.round(1000 / inferenceTime) : '--'}
             </Badge>
          )}
        </div>
        
        {isStreaming && (
          <Button size="icon" variant="destructive" onClick={stopCamera} className="rounded-full shadow-lg">
            <StopCircle className="size-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function AiModelSelector({ currentMode, onModeChange }: { currentMode: string, onModeChange: (mode: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="bg-black/60 backdrop-blur text-white border-white/20 hover:bg-black/80">
          <RefreshCw className="mr-2 size-4" />
          {currentMode === 'live' ? '摄像头画面' : MODELS.find(m => m.id === currentMode)?.name || 'AI 诊断'}
          <ChevronDown className="ml-2 size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
        <DropdownMenuItem onClick={() => onModeChange('live')} className="focus:bg-slate-800 focus:text-white cursor-pointer">
          摄像头画面 (Camera Feed)
        </DropdownMenuItem>
        {MODELS.map(model => (
          <DropdownMenuItem key={model.id} onClick={() => onModeChange(model.id)} className="focus:bg-slate-800 focus:text-white cursor-pointer">
            {model.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

AiCameraView.ModelSelector = AiModelSelector
