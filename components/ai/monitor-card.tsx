"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { cn } from "@/lib/utils"
import { LiveStreamPlayer } from "@/components/live-stream-player"
import { USBCameraPlayer } from "@/components/usb-camera-player"
import { Eye, ArrowUpRight, Video, Wifi, WifiOff, RefreshCw, Maximize2, X } from "lucide-react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle } from "@/components/ui/dialog"

const MemoizedLiveStreamPlayer = memo(LiveStreamPlayer)
const MemoizedUSBCameraPlayer = memo(USBCameraPlayer)

export function MonitorCard() {
  const [date, setDate] = useState("")
  const { connectionStatus } = useDeviceData()
  const [videoSource, setVideoSource] = useState<'live' | 'usb'>('live')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

  const liveSources = useMemo(() => ['webrtc://192.168.5.236/live/livestream'], [])

  useEffect(() => {
    const now = new Date()
    // Format date in Chinese
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    }
    setDate(now.toLocaleDateString('zh-CN', options))
  }, [])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const renderPlayer = (isFull = false) => {
     if (videoSource === 'live') {
        return (
          <MemoizedLiveStreamPlayer
            key={`live-${refreshKey}-${isFull ? 'full' : 'mini'}`}
            className="w-full h-full object-cover"
            sources={liveSources}
            autoplay
            muted={!isFull}
            controls={isFull}
          />
        )
     } else {
        return (
          <MemoizedUSBCameraPlayer 
             key={`usb-${refreshKey}-${isFull ? 'full' : 'mini'}`}
             className="w-full h-full object-cover"
          />
        )
     }
  }

  return (
    <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
    <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-[24px] p-4 border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-black flex items-center justify-center text-white">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">实时监控</h3>
            <p className="text-xs text-gray-500 font-medium">{date}</p>
          </div>
        </div>
        
        {/* Source Toggle */}
        <div className="flex bg-gray-100 rounded-full p-1">
           <button 
             onClick={() => setVideoSource('live')}
             className={cn(
               "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
               videoSource === 'live' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
             )}
           >
             直播
           </button>
           <button 
             onClick={() => setVideoSource('usb')}
             className={cn(
               "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
               videoSource === 'usb' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
             )}
           >
             USB
           </button>
        </div>
      </div>

      {/* Video Content */}
      <div className="relative w-full aspect-[4/3] bg-black rounded-[20px] overflow-hidden shadow-inner mb-4 group">
        {/* Only render mini player if not expanded to avoid resource conflict */}
        {!isExpanded && renderPlayer(false)}
        
        {/* Overlay Status */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full flex items-center gap-1.5 border border-white/10 z-10">
          <div className={cn("size-1.5 rounded-full animate-pulse", videoSource === 'live' ? "bg-red-500" : "bg-blue-500")}></div>
          <span className="text-[10px] font-medium text-white/90">{videoSource === 'live' ? '直播中' : 'USB相机'}</span>
        </div>

        {/* Controls (Visible on Hover) */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
           <DialogTrigger asChild>
              <button 
                className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all"
                title="全屏查看"
              >
                  <Maximize2 size={12} />
              </button>
           </DialogTrigger>
           <button 
              onClick={handleRefresh}
              className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all"
              title="刷新画面"
           >
              <RefreshCw size={12} />
           </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-[#E8F5E9]/50 rounded-[18px] p-3 flex items-center justify-between border border-[#E8F5E9]">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-black flex items-center justify-center text-white">
            <Video size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">主摄像头</h4>
            <p className="text-[10px] text-gray-500">高清 • 30fps</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-gray-100 shadow-sm">
            {connectionStatus.connected ? (
                <>
                    <Wifi size={12} className="text-green-500" />
                    <span className="text-[10px] font-bold text-gray-700">在线</span>
                </>
            ) : (
                <>
                    <WifiOff size={12} className="text-red-500" />
                    <span className="text-[10px] font-bold text-gray-700">离线</span>
                </>
            )}
        </div>
      </div>
    </div>

    {/* Expanded View Dialog */}
    <DialogContent className="max-w-[90vw] w-full h-[80vh] p-0 bg-black border-gray-800 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">全屏监控</DialogTitle>
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
            <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-2 border border-white/10">
                <div className={cn("size-2 rounded-full animate-pulse", videoSource === 'live' ? "bg-red-500" : "bg-blue-500")}></div>
                <span className="text-xs font-medium text-white/90">{videoSource === 'live' ? '直播中' : 'USB相机'} - 全屏模式</span>
            </div>
        </div>
        
        <DialogClose className="absolute top-4 right-4 z-50 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all">
            <X size={20} />
        </DialogClose>

        <div className="flex-1 w-full h-full relative bg-black flex items-center justify-center">
             {isExpanded && renderPlayer(true)}
        </div>
    </DialogContent>
    </Dialog>
  )
}
