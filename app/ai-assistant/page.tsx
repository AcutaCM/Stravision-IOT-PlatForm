"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { MobileBackground } from "@/components/mobile-background"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import type { UserPublic } from "@/lib/db/user-service"
import { PaperclipIcon, MicIcon, Globe, RotateCcw, Copy, Trash, Edit } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"

import {
  Message,
  MessageAvatar,
  MessageContent,
  AssistantBubble,
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
  Actions,
  Action,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  Loader,
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
  Suggestions,
  Suggestion,
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile
} from "@/components/ui/assistant-ui"

import MobileAISettingsModal from "@/components/mobile-ai-settings-modal"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"

interface Citation {
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

interface TaskItemModel { type: "text" | "file"; text: string; file?: { name: string; icon?: string } }
interface TaskModel { title: string; items: TaskItemModel[]; status: "pending" | "in_progress" | "completed" }

const MAX_CITATIONS_DISPLAY = 5

interface Message {
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  reasoning?: { text: string; durationMs?: number }
  tasks?: TaskModel[]
}

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number }

export default function AIAssistantPage() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  

  // Chat State
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const draftSaveTimer = useRef<number | null>(null)
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({})
  const [autoScroll, setAutoScroll] = useState(true)
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()

  // Fetch User
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (mounted && data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch {}
      if (mounted) setLoadingUser(false)
    })()
    return () => { mounted = false }
  }, [])

  // Load Settings
  useEffect(() => {
    try {
      const s = localStorage.getItem("ai-settings")
      if (s) {
        const parsed = JSON.parse(s)
        setAiSettings(parsed)
        if (!selectedModel && parsed?.model) setSelectedModel(parsed.model)
      }
      const es = localStorage.getItem("ai-enable-search")
      if (es) setEnableSearch(es === "true")
    } catch {}
  }, [])

  // Load Sessions
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sessions")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data?.sessions)) {
            setSessions(data.sessions)
            // Load last session or create new
            const lastId = localStorage.getItem("ai-last-session-id")
            if (lastId && data.sessions.find((s: SessionMeta) => s.id === lastId)) {
              setSessionId(lastId)
            } else if (data.sessions.length > 0) {
              setSessionId(data.sessions[0].id)
            } else {
              // Create default session
              const r = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` })
              })
              if (r.ok) {
                const s = await r.json()
                setSessionId(s.id)
                setSessions([s])
              }
            }
          }
        }
      } catch {}
    })()
  }, [])

  // Load Messages when Session ID changes
  useEffect(() => {
    if (!sessionId) return
    localStorage.setItem("ai-last-session-id", sessionId)
    ;(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          const msgs = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
          setMessages(msgs.length > 0 ? msgs : [{ role: "assistant", content: "你好！我是莓界AI助手，有什么可以帮助你的吗？" }])
          try {
            const draft = localStorage.getItem(`ai-input-draft-${sessionId}`)
            if (typeof draft === "string") setInput(draft)
          } catch {}
        }
      } catch {}
    })()
  }, [sessionId])

  // Scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading, autoScroll])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    if (!aiSettings?.apiKey || !aiSettings?.apiUrl) { setSettingsOpen(true); return }
    const userMsg = input.trim()
    setInput("")

    let ensuredSessionId = sessionId
    if (!ensuredSessionId) {
      try {
        const r = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` }) })
        if (r.ok) {
          const s = await r.json()
          ensuredSessionId = s.id
          setSessionId(s.id)
          setSessions(prev => [s, ...prev])
        }
      } catch {}
    }

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)
    setAutoScroll(true)

    try {
      try { if (ensuredSessionId) localStorage.removeItem(`ai-input-draft-${ensuredSessionId}`) } catch {}

      try {
        if (ensuredSessionId) {
          const current = sessions.find((s) => s.id === ensuredSessionId)
          const cand = userMsg.slice(0, 24)
          if (current && current.title && current.title.startsWith("新会话")) {
            await fetch(`/api/sessions/${ensuredSessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cand }) })
            setSessions((prev) => prev.map((s) => (s.id === ensuredSessionId ? { ...s, title: cand } : s)))
          }
        }
      } catch {}

      try {
        if (ensuredSessionId) {
          const payload = {
            messages: newMessages.map(m => ({
              role: m.role,
              content: m.content,
              citations: m.citations,
              reasoning: m.reasoning ? { text: m.reasoning.text, durationMs: m.reasoning.durationMs } : undefined,
              tasks: m.tasks,
            }))
          }
          await fetch(`/api/sessions/${ensuredSessionId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        }
      } catch {}

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          apiKey: aiSettings?.apiKey ?? "",
          apiUrl: aiSettings?.apiUrl ?? "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
          systemPrompt: aiSettings?.systemPrompt ?? "",
          sessionId: ensuredSessionId,
          enableSearch,
          deviceData,
          weatherData
        })
      })

      if (!res.ok) throw new Error("Failed to send message")
      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const assistantMsg: Message = { role: "assistant", content: "" }
      let reasoningText = ""
      let reasoningStart = -1
      const startTs = Date.now()
      setMessages(prev => [...prev, assistantMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              const content = data.choices?.[0]?.delta?.content ?? data.content
              if (content) {
                assistantMsg.content += content
                const combined = assistantMsg.content
                if (reasoningStart === -1) {
                  const sIdx = combined.indexOf("<REASONING>")
                  if (sIdx !== -1) reasoningStart = sIdx
                }
                let display = combined
                if (reasoningStart !== -1) {
                  const endIdx = combined.indexOf("</REASONING>", reasoningStart)
                  if (endIdx !== -1) {
                    reasoningText = combined.slice(reasoningStart + 11, endIdx)
                    display = combined.slice(0, reasoningStart) + combined.slice(endIdx + 12)
                  } else {
                    reasoningText = combined.slice(reasoningStart + 11)
                    display = combined.slice(0, reasoningStart)
                  }
                }
                let tasksUpdate: TaskModel[] | undefined
                const tStart = combined.indexOf("<TASKS>")
                if (tStart !== -1) {
                  const tEnd = combined.indexOf("</TASKS>", tStart)
                  if (tEnd !== -1) {
                    const json = combined.slice(tStart + 7, tEnd)
                    try {
                      const raw = JSON.parse(json) as unknown
                      if (Array.isArray(raw)) {
                        tasksUpdate = raw.map((v): TaskModel => {
                          const o = v as Record<string, unknown>
                          const rawItems = Array.isArray(o.items) ? o.items : []
                          const items: TaskItemModel[] = rawItems.map((it): TaskItemModel => {
                            const itObj = it as Record<string, unknown>
                            const typeVal = String(itObj.type ?? "text") as TaskItemModel["type"]
                            const textVal = String(itObj.text ?? "")
                            const fileRaw = itObj.file
                            let file: { name: string; icon?: string } | undefined
                            if (fileRaw && typeof fileRaw === "object") {
                              const f = fileRaw as Record<string, unknown>
                              const name = typeof f.name === "string" ? f.name : ""
                              const icon = typeof f.icon === "string" ? f.icon : undefined
                              file = { name, icon }
                            }
                            return { type: typeVal, text: textVal, file }
                          })
                          const statusVal = String(o.status ?? "pending") as TaskModel["status"]
                          const titleVal = String(o.title ?? "任务")
                          return { title: titleVal, items, status: statusVal }
                        })
                      }
                    } catch {}
                    display = display.slice(0, tStart) + display.slice(tEnd + 8)
                  } else {
                    display = display.slice(0, tStart)
                  }
                }
                setMessages(prev => {
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = { role: "assistant", content: display, reasoning: { text: reasoningText, durationMs: Date.now() - startTs }, tasks: tasksUpdate ?? newMsgs[newMsgs.length - 1].tasks }
                  return newMsgs
                })
              }
            } catch {}
          }
        }
      }

      const fullCombined = assistantMsg.content
      let finalTasks: TaskModel[] | undefined
      let finalCitations: Citation[] = []
      const ms = fullCombined.match(/<SOURCES>\s*([\s\S]*?)\s*<\/SOURCES>/)
      if (ms && ms[1]) {
        try {
          const arr = JSON.parse(ms[1]) as unknown
          if (Array.isArray(arr)) {
            const pickUrlFromText = (s?: string) => {
              if (!s) return undefined
              const r1 = s.match(/https?:\/\/[^\s)]+/i)
              if (r1) return r1[0]
              const r2 = s.match(/\b([a-z0-9.-]+\.[a-z]{2,})(\/[^\s)]*)?/i)
              return r2 ? `https://${r2[0]}` : undefined
            }
            finalCitations = arr.map((v): Citation | null => {
              if (typeof v !== "object" || v === null) return null
              const o = v as Record<string, unknown>
              const num = String((o.number as string | number | undefined) ?? "1")
              const title = typeof o.title === "string" && o.title.trim() ? o.title.trim() : (typeof o.url === "string" ? o.url : "")
              let u = typeof o.url === "string" ? o.url : undefined
              if (!u) u = typeof o.href === "string" ? o.href : undefined
              if (!u) u = typeof o.link === "string" ? o.link : undefined
              if (!u) u = typeof o.source === "string" ? o.source : undefined
              if (!u) u = typeof o.website === "string" ? o.website : undefined
              if (!u) u = typeof o.page === "string" ? o.page : undefined
              if (!u) u = typeof o.page_url === "string" ? o.page_url : undefined
              if (!u) u = typeof o.origin === "string" ? o.origin : undefined
              if (!u) u = typeof o.source_url === "string" ? o.source_url : undefined
              if (!u) u = typeof o.openUrl === "string" ? o.openUrl : undefined
              if (!u) u = pickUrlFromText(title) ?? pickUrlFromText(typeof o.description === "string" ? o.description : undefined) ?? pickUrlFromText(typeof o.quote === "string" ? o.quote : undefined)
              if (!u) return null
              if (!/^https?:\/\//i.test(u)) u = `https://${u}`
              const description = typeof o.description === "string" ? o.description : undefined
              const quote = typeof o.quote === "string" ? o.quote : undefined
              return { number: num, title: String(title || u), url: String(u), description, quote }
            }).filter((x): x is Citation => !!x)
            finalCitations = dedupeMergeCitations(finalCitations)
          }
        } catch {}
      }
      const mt = fullCombined.match(/<TASKS>\s*([\s\S]*?)\s*<\/TASKS>/)
      if (mt && mt[1]) {
        try {
          const arr = JSON.parse(mt[1]) as unknown
          if (Array.isArray(arr)) {
            finalTasks = arr.map((t) => {
              const o = t as Record<string, unknown>
              const itemsRaw = Array.isArray(o.items) ? o.items : []
              const items: TaskItemModel[] = itemsRaw.map((it): TaskItemModel => {
                const io = it as Record<string, unknown>
                const typeVal = String(io.type ?? "text") as TaskItemModel["type"]
                const textVal = String(io.text ?? "")
                const fr = io.file
                let file: { name: string; icon?: string } | undefined
                if (fr && typeof fr === "object") {
                  const fo = fr as Record<string, unknown>
                  const name = typeof fo.name === "string" ? fo.name : ""
                  const icon = typeof fo.icon === "string" ? fo.icon : undefined
                  file = { name, icon }
                }
                return { type: typeVal, text: textVal, file }
              })
              const statusVal = String(o.status ?? "pending") as TaskModel["status"]
              const titleVal = String(o.title ?? "任务")
              return { title: titleVal, items, status: statusVal }
            })
          }
        } catch {}
      }

      setMessages(prev => {
        const nm = [...prev]
        const last = nm[nm.length - 1]
        const clean = last.content.replace(/<REASONING>[\s\S]*?<\/REASONING>/, "").replace(/<TASKS>[\s\S]*?<\/TASKS>/, "").replace(/<SOURCES>[\s\S]*?<\/SOURCES>/, "").trim()
        nm[nm.length - 1] = { ...last, content: clean, tasks: finalTasks ?? last.tasks, citations: finalCitations.length > 0 ? finalCitations : last.citations }
        return nm
      })

      try {
        const needRefine = (finalCitations.length === 0) || finalCitations.some(c => !(/^https?:\/\//i.test(c.url)))
        if (needRefine && aiSettings?.apiKey) {
          const r = await fetch('/api/citations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...messages, { role: 'assistant', content: fullCombined.replace(/<REASONING>[\s\S]*?<\/REASONING>/, '').replace(/<TASKS>[\s\S]*?<\/TASKS>/, '').replace(/<SOURCES>[\s\S]*?<\/SOURCES>/, '').trim() }].map(m => ({ role: m.role, content: m.content })),
              apiKey: aiSettings.apiKey,
              apiUrl: aiSettings.apiUrl,
              model: selectedModel || aiSettings.model,
              systemPrompt: aiSettings.systemPrompt,
              enableSearch,
            })
          })
          if (r.ok) {
            const data = await r.json()
            const refined = Array.isArray(data?.citations) ? data.citations as Citation[] : []
            if (refined.length > 0) {
              const merged = dedupeMergeCitations(refined)
              setMessages(prev => {
                const nm = [...prev]
                const last = nm[nm.length - 1]
                nm[nm.length - 1] = { ...last, citations: merged }
                return nm
              })
              finalCitations = merged
            }
          }
        }
      } catch {}

      try {
        if (sessionId) {
          const payload = {
            messages: [...messages, { role: "user", content: userMsg }, { role: "assistant", content: fullCombined.replace(/<REASONING>[\s\S]*?<\/REASONING>/, "").replace(/<TASKS>[\s\S]*?<\/TASKS>/, "").replace(/<SOURCES>[\s\S]*?<\/SOURCES>/, "").trim(), reasoning: { text: reasoningText, durationMs: Date.now() - startTs }, tasks: finalTasks, citations: dedupeMergeCitations(finalCitations) }].map((m) => ({
              role: m.role,
              content: m.content,
              citations: m.citations,
              reasoning: m.reasoning ? { text: m.reasoning.text, durationMs: m.reasoning.durationMs } : undefined,
              tasks: m.tasks,
            }))
          }
          await fetch(`/api/sessions/${sessionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        }
      } catch {}
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，发生了一些错误，请稍后再试。" }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingsSave = (settings: AISettings) => {
    setAiSettings(settings)
    localStorage.setItem("ai-settings", JSON.stringify(settings))
    setSelectedModel(settings.model)
  }

  const createNewSession = async () => {
    try {
      const r = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` })
      })
      if (r.ok) {
        const s = await r.json()
        setSessionId(s.id)
        setSessions(prev => [s, ...prev])
      }
    } catch {}
  }

  const deleteSession = async () => {
    if (!sessionId || !confirm("确定要删除当前会话吗？")) return
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" })
      const nextSessions = sessions.filter(s => s.id !== sessionId)
      setSessions(nextSessions)
      if (nextSessions.length > 0) {
        setSessionId(nextSessions[0].id)
      } else {
        createNewSession()
      }
    } catch {}
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const executeDeviceCommand = async (cmd: unknown) => {
    try {
      let payload: Record<string, unknown> | null = null
      if (cmd && typeof cmd === "object") {
        const o = cmd as Record<string, unknown>
        const action = String(o.action ?? "")
        if (action === "toggle_relay") {
          payload = { type: "relay", relayNum: Number(o.device), newState: Number(o.value) }
        } else if (action === "set_led") {
          payload = { type: "led", led1: Number(o.r), led2: Number(o.g), led3: Number(o.b) }
        }
      }
      if (!payload) return
      const r = await fetch("/api/mqtt/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const j = await r.json()
      const resultMsg = j?.success ? "✅ 命令执行成功！设备状态已更新。" : `❌ 命令执行失败：${j?.message || j?.error || "未知错误"}`
      setMessages(prev => [...prev, { role: "assistant", content: resultMsg }])
      try {
        if (sessionId) {
          const payload = {
            messages: [...messages, { role: "assistant", content: resultMsg }].map(m => ({
              role: m.role,
              content: m.content,
              citations: m.citations,
              reasoning: m.reasoning ? { text: m.reasoning.text, durationMs: m.reasoning.durationMs } : undefined,
              tasks: m.tasks,
            }))
          }
          await fetch(`/api/sessions/${sessionId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        }
      } catch {}
    } catch (error) {
      const errMsg = `❌ 命令执行失败：${error instanceof Error ? error.message : "网络错误"}`
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }])
      try {
        if (sessionId) {
          const payload = {
            messages: [...messages, { role: "assistant", content: errMsg }].map(m => ({
              role: m.role,
              content: m.content,
              citations: m.citations,
              reasoning: m.reasoning ? { text: m.reasoning.text, durationMs: m.reasoning.durationMs } : undefined,
              tasks: m.tasks,
            }))
          }
          await fetch(`/api/sessions/${sessionId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        }
      } catch {}
    }
  }

  const renderMessageContent = (msg: Message) => {
    const content = msg.content
    const parts: { type: "text" | "code" | "chart"; language?: string; value: string; chartType?: string }[] = []
    const blockRegex = /<CHART\s+type=\"([^\"]+)\"\s*>([\s\S]*?)<\/CHART>|```(\w+)?\n([\s\S]*?)```/g
    let lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = blockRegex.exec(content)) !== null) {
      if (m.index > lastIndex) parts.push({ type: "text", value: content.slice(lastIndex, m.index) })
      if (m[1] && m[2]) {
        parts.push({ type: "chart", chartType: m[1], value: m[2] })
      } else {
        parts.push({ type: "code", language: m[3] || "", value: m[4] || "" })
      }
      lastIndex = blockRegex.lastIndex
    }
    if (lastIndex < content.length) parts.push({ type: "text", value: content.slice(lastIndex) })
    return parts.map((p, i) => {
      if (p.type === "code") {
        try {
          const maybe = JSON.parse(p.value)
          const isDeviceCommand = maybe && typeof maybe === "object" && maybe.action && (maybe.action === "toggle_relay" || maybe.action === "set_led")
          if (isDeviceCommand) {
            return (
              <div key={`device-cmd-${i}`} className="mt-2 w-full rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/10 p-3">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-foreground/80">设备控制命令</div>
                  <pre className="text-xs text-foreground/80 bg-black/20 p-2 rounded overflow-x-auto"><code>{JSON.stringify(maybe, null, 2)}</code></pre>
                  <Button onClick={() => executeDeviceCommand(maybe)} className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">执行命令</Button>
                </div>
              </div>
            )
          }
        } catch {}
        return (
          <pre key={`code-${i}`} className="mt-2 w-full overflow-x-auto rounded-2xl bg-black/30 text-white p-3 border border-white/10"><code className="font-mono text-xs">{p.value}</code></pre>
        )
      }
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          key={`md-${i}`}
          components={{
            img: ({ ...props }) => <img {...props} className="max-w-full h-auto rounded-lg" alt={props.alt || ""} />
          }}
        >
          {p.value}
        </ReactMarkdown>
      )
    })
  }

  const starterPrompts = [
    "草莓种植的最佳温度是多少？",
    "如何防治草莓白粉病？",
    "现在的环境数据正常吗？",
    "帮我生成一份施肥计划"
  ]

  return (
    <div className="min-h-screen w-screen bg-background text-foreground overflow-hidden flex flex-col">
      <MobileBackground />
      
      {/* Content Wrapper */}
      <motion.div 
        className="flex-1 flex flex-col relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-[56px] border-b border-white/5 bg-white/10 dark:bg-black/10 backdrop-blur-xl shadow-sm sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative size-8 animate-[breathe_4s_ease-in-out_infinite]">
            <Image src="/logo.svg" alt="logo" fill className="object-contain" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">STRAVISION</div>
            <div className="text-[10px] text-muted-foreground">AI 种植助手</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="cursor-pointer bg-primary/10 hover:bg-primary/20 transition-colors border-primary/20 backdrop-blur-sm"
            onClick={() => setSettingsOpen(true)}
          >
            {aiSettings?.model || "未设置模型"}
          </Badge>
          {!loadingUser && user ? <UserAvatarMenu user={user} /> : <Link href="/login" className="text-sm text-muted-foreground">登录</Link>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative z-0 flex flex-col">
        <Conversation className="h-full flex flex-col">
          <ConversationContent ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
            {messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant') ? (
               <div className="flex flex-col items-center justify-center py-8 space-y-6">
                 <div className="text-center space-y-2">
                   <div className="size-16 bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                     <div className="relative size-10">
                       <Image src="/logo.svg" alt="AI" fill className="object-contain" />
                     </div>
                   </div>
                   <h2 className="text-lg font-semibold">我是您的 AI 种植助手</h2>
                   <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                     我可以帮您解答种植问题、分析环境数据、制定管理计划。
                   </p>
                 </div>
                 <Suggestions>
                   {starterPrompts.map((p) => (
                     <Suggestion key={p} suggestion={p} onChoose={(t) => { setInput(t); handleSend() }} className="bg-white/30 dark:bg-black/30 backdrop-blur-md border-white/10 hover:bg-white/40 transition-all shadow-sm" />
                   ))}
                 </Suggestions>
               </div>
            ) : null}

            <div className="space-y-6 pb-4">
              {messages.map((msg, i) => (
                <Message key={i} from={msg.role}>
                  <MessageAvatar
                    className={msg.role === 'user' ? "bg-blue-500 shadow-md" : "bg-primary shadow-md"}
                    src={msg.role === 'assistant' ? "/logo.svg" : (user?.avatar_url || undefined)}
                    name={msg.role === 'assistant' ? "AI" : (user?.username || undefined)}
                    from={msg.role}
                  />
                  <MessageContent>
                    <AssistantBubble
                      isUser={msg.role === 'user'}
                      className={msg.role === 'user' ? "bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]" : "bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-[0_4px_16px_0_rgba(31,38,135,0.05)] border border-white/20 dark:border-white/10"}
                    >
                      {renderMessageContent(msg)}
                    </AssistantBubble>
                    {msg.role === 'assistant' && msg.reasoning?.text && (
                      <Reasoning className="mt-2">
                        <ReasoningTrigger>思考过程</ReasoningTrigger>
                        <ReasoningContent>{msg.reasoning.text}</ReasoningContent>
                      </Reasoning>
                    )}
                    {msg.role === 'assistant' && Array.isArray(msg.citations) && msg.citations.length > 0 && (
                      <Sources className="mt-2">
                        <SourcesTrigger count={(expandedCitations[i] ? msg.citations.length : Math.min(msg.citations.length, MAX_CITATIONS_DISPLAY))} />
                        <SourcesContent>
                          {(expandedCitations[i] ? msg.citations : msg.citations.slice(0, MAX_CITATIONS_DISPLAY)).map((c, idx) => (
                            <Source key={`c-${i}-${idx}`} href={c.url} title={c.title} description={c.description} quote={c.quote} number={c.number} />
                          ))}
                          {msg.citations.length > MAX_CITATIONS_DISPLAY ? (
                            <div className="mt-2 flex justify-end">
                              <Button variant="ghost" size="sm" className="h-6 px-2 rounded-full" onClick={() => setExpandedCitations(prev => ({ ...prev, [i]: !prev[i] }))}>
                                {expandedCitations[i] ? "收起" : "展开全部"}
                              </Button>
                            </div>
                          ) : null}
                        </SourcesContent>
                      </Sources>
                    )}
                    {msg.role === 'assistant' && Array.isArray(msg.tasks) && msg.tasks.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.tasks.map((t, ti) => (
                          <Task key={`t-${i}-${ti}`}> 
                            <TaskTrigger title={t.title} status={t.status} />
                            <TaskContent>
                              {t.items.map((it, ii) => (
                                <TaskItem key={`ti-${i}-${ti}-${ii}`}>
                                  {it.type === 'file' && it.file?.name ? <TaskItemFile>{it.file.name}</TaskItemFile> : null}
                                  <span className="ml-1">{it.text}</span>
                                </TaskItem>
                              ))}
                            </TaskContent>
                          </Task>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && i === messages.length - 1 && !isLoading && (
                      <Actions className="mt-2">
                         <Action label="复制" onClick={() => copyText(msg.content)} className="bg-white/20 dark:bg-black/20 backdrop-blur-sm border-white/10 hover:bg-white/30">
                           <Copy className="size-3" />
                         </Action>
                      </Actions>
                    )}
                  </MessageContent>
                </Message>
              ))}
              {isLoading && (
                <Message from="assistant">
                  <MessageAvatar className="bg-primary shadow-md" src="/logo.svg" name="AI" />
                  <MessageContent>
                    <AssistantBubble className="bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-[0_4px_16px_0_rgba(31,38,135,0.05)] border border-white/20 dark:border-white/10">
                      <Loader size={16} />
                    </AssistantBubble>
                  </MessageContent>
                </Message>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ConversationContent>
        </Conversation>
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-white/10 dark:bg-black/10 backdrop-blur-xl border-t border-white/5 p-4 pb-24 z-10 shadow-[0_-8px_32px_0_rgba(31,38,135,0.05)]">
        <PromptInput onSubmit={(e) => { e.preventDefault(); handleSend() }}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => {
              const val = e.currentTarget.value
              setInput(val)
              if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current)
              draftSaveTimer.current = window.setTimeout(() => {
                try { if (sessionId) localStorage.setItem(`ai-input-draft-${sessionId}`, val) } catch {}
              }, 300)
            }}
            placeholder="输入您的问题..."
            disabled={isLoading}
            className="min-h-[44px] bg-white/20 dark:bg-black/20 border-white/10 backdrop-blur-sm focus:border-primary/50 placeholder:text-muted-foreground/70"
          />
          <PromptInputToolbar className="mt-2">
            <PromptInputTools>
              <PromptInputModelSelect value={selectedModel} onValueChange={setSelectedModel}>
                <PromptInputModelSelectTrigger className="bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/10">
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  <PromptInputModelSelectItem value="gpt-4o-mini">GPT-4o mini</PromptInputModelSelectItem>
                  <PromptInputModelSelectItem value="gpt-4o">GPT-4o</PromptInputModelSelectItem>
                  <PromptInputModelSelectItem value="gpt-3.5-turbo">GPT-3.5</PromptInputModelSelectItem>
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
              <PromptInputButton onClick={() => setEnableSearch(!enableSearch)} className={`transition-colors ${enableSearch ? "text-blue-500 bg-blue-500/10" : "hover:bg-white/10"}`}>
                <Globe size={18} />
              </PromptInputButton>
              <PromptInputButton onClick={createNewSession} className="hover:bg-white/10">
                <PlusIcon size={18} />
              </PromptInputButton>
              <PromptInputButton onClick={deleteSession} className="hover:bg-white/10">
                <Trash size={18} />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input.trim() || isLoading} status={isLoading ? 'loading' : 'idle'} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" />
          </PromptInputToolbar>
        </PromptInput>
      </div>
      </motion.div>

      <MobileBottomNav position="fixed" />

      <MobileAISettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSettingsSave}
      />
    </div>
  )
}

function PlusIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
function normalizeCitationUrl(u: string): string {
  try {
    const raw = /^https?:\/\//i.test(u) ? u : `https://${u}`
    const url = new URL(raw)
    url.hash = ""
    const path = url.pathname.replace(/\/+$/g, "") || "/"
    const out = `${url.origin}${path}${url.search}`
    return out.toLowerCase()
  } catch {
    return String(u || "").trim().toLowerCase()
  }
}

function dedupeMergeCitations(list: Citation[]): Citation[] {
  const map = new Map<string, Citation>()
  for (const c of list) {
    const key = normalizeCitationUrl(c.url)
    if (!map.has(key)) {
      map.set(key, { ...c, url: /^https?:\/\//i.test(key) ? key : c.url })
    } else {
      const prev = map.get(key) as Citation
      const title = prev.title && prev.title.trim() ? prev.title : c.title
      const description = prev.description && prev.description.trim() ? prev.description : c.description
      const quote = prev.quote && prev.quote.trim() ? prev.quote : c.quote
      const number = prev.number || c.number
      map.set(key, { ...prev, title, description, quote, number })
    }
  }
  const out = Array.from(map.values())
  for (let i = 0; i < out.length; i++) out[i].number = String(i + 1)
  return out
}
