"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle } from "lucide-react"

interface USBCameraPlayerProps {
    className?: string
    id?: string
    autoPlay?: boolean
    muted?: boolean
    mirror?: boolean
}

export function USBCameraPlayer({
    className,
    id,
    autoPlay = true,
    muted = true,
    mirror = false
}: USBCameraPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [error, setError] = useState<string | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

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
                        facingMode: "user"
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
                    } catch (e) {
                        console.error("[USBCamera] Play failed:", e)
                    }
                }
            } catch (err: any) {
                if (!mounted) return
                console.error("Error accessing camera:", err)
                setError(err.message || "无法访问摄像头，请检查权限设置")
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
        }
    }, [])

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
        <video
            ref={videoRef}
            id={id}
            className={`${className} ${mirror ? 'scale-x-[-1]' : ''}`}
            autoPlay={autoPlay}
            muted={muted}
            playsInline
        />
    )
}
