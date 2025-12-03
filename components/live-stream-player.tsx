"use client"

import { useEffect, useRef, useId, useMemo } from "react"

type TXLivePlayer = {
  setRenderView: (id: string) => void
  startPlay: (url: string) => Promise<void> | void
  stopPlay: () => void
  setObserver?: (obs: { onPlayerEvent?: (event: string, info?: unknown) => void; onStatistics?: (stats: unknown) => void }) => void
  videoView?: HTMLVideoElement
}

type HlsInstance = { loadSource: (src: string) => void; attachMedia: (el: HTMLVideoElement) => void; destroy: () => void }
type HlsConstructor = new () => HlsInstance

type FlvPlayerInstance = { attachMediaElement: (el: HTMLVideoElement) => void; load: () => void; play: () => void; destroy: () => void; unload: () => void }
type FlvJS = { createPlayer: (opts: { type: string; url: string }) => FlvPlayerInstance }

declare global {
  interface Window {
    TXLivePlayer?: new () => TXLivePlayer
    Hls?: HlsConstructor
    flvjs?: FlvJS
  }
}

 

function loadScriptOnce(id: string, src: string) {
  return new Promise<void>((resolve) => {
    if (document.getElementById(id)) return resolve()
    const s = document.createElement("script")
    s.id = id
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => {
      try {
        const el = document.getElementById(id)
        if (el) el.remove()
      } catch {}
      resolve()
    }
    document.body.appendChild(s)
  })
}

async function loadScriptWithFallback(id: string, urls: string[]) {
  if (document.getElementById(id)) return
  for (let i = 0; i < urls.length; i++) {
    const src = urls[i]
    try {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script")
        s.id = id
        s.src = src
        s.onload = () => resolve()
        s.onerror = () => {
          try { const el = document.getElementById(id); if (el) el.remove() } catch {}
          reject(new Error("load failed"))
        }
        document.body.appendChild(s)
      })
      return
    } catch {}
  }
}

 

export function LiveStreamPlayer({
  sources,
  autoplay = true,
  muted = true,
  controls = true,
  className,
  id,
  poster,
  licenseUrl
}:{
  sources: Array<string | { src: string }>
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  className?: string
  id?: string
  poster?: string
  licenseUrl?: string
}) {
  const autoId = useId()
  const containerId = useMemo(() => id ?? `tc-player-${autoId}`, [id, autoId])
  const connectTimerRef = useRef<number | null>(null)
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null)
  const webrtcRef = useRef<TXLivePlayer | null>(null)
  const hlsRef = useRef<HlsInstance | null>(null)
  const flvRef = useRef<FlvPlayerInstance | null>(null)

  useEffect(() => {
    void licenseUrl
    const run = async () => {
      await loadScriptOnce("hls-js-1", "https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js")
      await loadScriptOnce("flv-js-1", "https://cdn.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js")
      await loadScriptWithFallback("txliveplayer-js-1-3-2", [
        "https://video.sdk.qcloud.com/web/TXLivePlayer-1.3.2.min.js",
        "https://web.sdk.qcloud.com/player/TXLivePlayer-1.3.2.min.js"
      ])

      const normalized = sources.map((s) => {
        const obj = typeof s === "string" ? { src: s } : s
        const url = obj.src
        const isWebRTC = typeof url === "string" && url.startsWith("webrtc://")
        const isM3U8 = typeof url === "string" && url.toLowerCase().endsWith(".m3u8")
        const isFLV = typeof url === "string" && url.toLowerCase().endsWith(".flv")
        return isWebRTC ? { ...obj, type: "webrtc" } : isM3U8 ? { ...obj, type: "hls" } : isFLV ? { ...obj, type: "flv" } : obj
      })
      const sequence = normalized.map((o) => (o as { src: string }).src)
      let nextIndex = 0
      let retryCount = 0
      const maxRetry = 3

      const videoEl = document.getElementById(containerId) as HTMLVideoElement | null
      if (!videoEl) return
      if (muted) videoEl.muted = true
      videoEl.setAttribute("playsinline", "true")
      videoEl.setAttribute("webkit-playsinline", "true")
      videoEl.setAttribute("x5-playsinline", "true")
      videoEl.setAttribute("x5-video-player-type", "h5")

      const playCurrent = async () => {
        const currentUrl = sequence[nextIndex]
        const type = (normalized[nextIndex] as unknown as { type?: string }).type
        try {
          if (type === "webrtc" && window.TXLivePlayer) {
            webrtcRef.current?.stopPlay()
            hlsRef.current?.destroy(); hlsRef.current = null
            flvRef.current?.destroy(); flvRef.current = null
            webrtcRef.current = new window.TXLivePlayer()
            webrtcRef.current.setRenderView(containerId)
            try { videoEl.play().catch(() => {}) } catch {}
            webrtcRef.current.startPlay(currentUrl)
            webrtcRef.current.setObserver?.({
              onPlayerEvent: (event) => {
                const s = String(event).toLowerCase()
                if (s.includes("disconnect") || s.includes("close") || s.includes("failed")) {
                  const hasNext = nextIndex + 1 < sequence.length
                  nextIndex = hasNext ? nextIndex + 1 : 0
                  setTimeout(() => { void playCurrent() }, 500)
                }
              }
            })
          } else if (type === "hls" && window.Hls) {
            webrtcRef.current?.stopPlay(); webrtcRef.current = null
            flvRef.current?.destroy(); flvRef.current = null
            hlsRef.current?.destroy()
            hlsRef.current = new window.Hls()
            hlsRef.current.loadSource(currentUrl)
            hlsRef.current.attachMedia(videoEl)
            try { videoEl.play().catch(() => {}) } catch {}
          } else if (type === "flv" && window.flvjs) {
            webrtcRef.current?.stopPlay(); webrtcRef.current = null
            hlsRef.current?.destroy(); hlsRef.current = null
            flvRef.current?.destroy()
            flvRef.current = window.flvjs.createPlayer({ type: "flv", url: currentUrl })
            flvRef.current.attachMediaElement(videoEl)
            flvRef.current.load()
            try { videoEl.play().catch(() => {}) } catch {}
          } else {
            const hasNext = nextIndex + 1 < sequence.length
            nextIndex = hasNext ? nextIndex + 1 : 0
            await playCurrent()
          }
        } catch {
          const hasNext = nextIndex + 1 < sequence.length
          nextIndex = hasNext ? nextIndex + 1 : 0
          if (retryCount < maxRetry) {
            retryCount += 1
            setTimeout(() => { void playCurrent() }, 800)
          }
        }
      }

      // Watchdog for Live Stream
      let lastTime = 0
      let freezeCount = 0
      if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current)
      watchdogTimerRef.current = setInterval(() => {
        if (videoEl && !videoEl.paused && !videoEl.ended && videoEl.readyState > 2) {
           const currentTime = videoEl.currentTime
           if (currentTime === lastTime) {
             freezeCount++
             // Faster refresh: check every 0.5s, reconnect after 1.5s (3 checks)
             if (freezeCount > 3) { 
                console.log("[LivePlayer] Stream frozen detected, reconnecting...")
                freezeCount = 0
                const hasNext = nextIndex + 1 < sequence.length
                nextIndex = hasNext ? nextIndex + 1 : 0
                void playCurrent()
             }
           } else {
             freezeCount = 0
             lastTime = currentTime
           }
        }
      }, 500) // Check every 500ms instead of 1000ms

      if (connectTimerRef.current) { window.clearTimeout(connectTimerRef.current) }
      connectTimerRef.current = window.setTimeout(() => { void playCurrent() }, 0)

      videoEl.addEventListener("stalled", () => { const hasNext = nextIndex + 1 < sequence.length; nextIndex = hasNext ? nextIndex + 1 : 0; void playCurrent() })
      videoEl.addEventListener("error", () => { const hasNext = nextIndex + 1 < sequence.length; nextIndex = hasNext ? nextIndex + 1 : 0; void playCurrent() })

      window.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { try { videoEl.play().catch(() => {}) } catch {} } })
      window.addEventListener("online", () => { setTimeout(() => { void playCurrent() }, 500) })
    }
    run()
    return () => {
      if (connectTimerRef.current) { window.clearTimeout(connectTimerRef.current); connectTimerRef.current = null }
      if (watchdogTimerRef.current) { clearInterval(watchdogTimerRef.current); watchdogTimerRef.current = null }
      
      try { webrtcRef.current?.stopPlay() } catch {}
      webrtcRef.current = null
      hlsRef.current?.destroy(); hlsRef.current = null
      try { flvRef.current?.unload?.() } catch {}
      flvRef.current?.destroy(); flvRef.current = null
    }
  }, [controls, autoplay, muted, poster, sources, containerId, licenseUrl])

  return <video id={containerId} preload="auto" playsInline autoPlay={autoplay} muted={muted} controls={controls} className={className ?? ""} poster={poster} />
}
