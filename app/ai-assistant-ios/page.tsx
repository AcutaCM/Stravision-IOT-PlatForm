"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { 
  Copy, 
  RotateCcw, 
  Settings, 
  X,
  ChevronDown,
  Search,
  Sparkles,
  CircleHelp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  ArrowUp,
  Paperclip,
  FileText,
  Sun,
  Activity,
  Sprout,
  Zap,
  ArrowUpRight,
  ArrowRight,
  Plus
} from "lucide-react"
import MermaidChart from "@/components/mermaid-chart"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import ChartRenderer from "@/components/chart-renderer"
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  Conversation,
  ConversationContent,
} from "@/components/ui/assistant-ui"

import { AISettingsDialog } from "@/components/ai-settings-dialog"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { cn } from "@/lib/utils"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai/reasoning"
import { MonitorCard } from "@/components/ai/monitor-card"
import { DeviceBentoGrid } from "@/components/ai/device-bento-grid"
import { ControlBentoGrid } from "@/components/ai/control-bento-grid"
import { ScheduleCard } from "@/components/ai/schedule-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

interface Citation {
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

interface TaskItemModel { type: "text" | "file"; text: string; file?: { name: string; icon?: string } }
interface TaskModel { title: string; items: TaskItemModel[]; status: "pending" | "in_progress" | "completed" }

interface Message {
  role: "user" | "assistant"
  content: string | Array<{ type: 'text' | 'image_url', text?: string, image_url?: { url: string } }>
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

export default function AIAssistantIOSPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserPublic | null>(null)
  
  // Chat State
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [enableReasoning, setEnableReasoning] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [attachments, setAttachments] = useState<string[]>([])
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()
  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading'|'success'|'error'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)
  
  const showNotice = (title: string, description?: string, variant?: 'loading'|'success'|'error') => {
    const id = ++noticeIdCounter.current
    setNotices(prev => [...prev, { id, title, description, variant, expanded: false }])
    
    if (variant && variant !== 'loading') {
      setTimeout(() => {
        setNotices(prev => prev.filter(n => n.id !== id))
      }, 5000)
    }
  }

  const closeNotice = (id: number) => {
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  const toggleNoticeExpanded = (id: number) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, expanded: !n.expanded } : n))
  }

  // Fetch User
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (mounted && data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch {}
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
            const lastId = localStorage.getItem("ai-last-session-id")
            if (lastId && data.sessions.find((s: SessionMeta) => s.id === lastId)) {
              setSessionId(lastId)
            } else if (data.sessions.length > 0) {
              setSessionId(data.sessions[0].id)
            } else {
              createNewSession()
            }
          }
        }
      } catch {}
    })()
  }, [])

  // Load Messages
  useEffect(() => {
    if (!sessionId) return
    localStorage.setItem("ai-last-session-id", sessionId)
    ;(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          const msgs = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
          setMessages(msgs.length > 0 ? msgs : [])
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

  const executeCommands = async (commands: any[]) => {
    if (!commands || commands.length === 0) return
    showNotice("正在执行指令...", `共发现 ${commands.length} 个操作`, "loading")

    for (const cmd of commands) {
      try {
        if (cmd.action === "set_led") {
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_led', r: cmd.r, g: cmd.g, b: cmd.b })
          })
          if (res.ok) {
            showNotice("调控成功 ✅", `已开启补光灯 (R:${cmd.r} G:${cmd.g} B:${cmd.b})`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch {}
            showNotice("调控失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "toggle_relay") {
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_relay', device: cmd.device, value: cmd.value })
          })
          if (res.ok) {
            showNotice("开关执行成功 ✅", `设备 ${cmd.device} 状态 ${cmd.value === 1 ? '开启' : '关闭'}`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch {}
            showNotice("开关执行失败", err || `请求错误 ${res.status}`, "error")
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (e) {
        console.error("Command execution error", e)
      }
    }
  }

  const handleSend = async (overrideText?: any) => {
    const text = typeof overrideText === "string" ? overrideText : input
    if (!text.trim() || isLoading) return
    if (!aiSettings?.apiKey) { setSettingsOpen(true); return }
    const userMsg = text.trim()
    setInput("")
    setEnableSearch(false)

    let ensuredSessionId = sessionId
    if (!ensuredSessionId) {
      await createNewSession()
      const r = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` }) })
      if (r.ok) {
        const s = await r.json()
        ensuredSessionId = s.id
        setSessionId(s.id)
        setSessions(prev => [s, ...prev])
      }
    }

    const userMessageContent: Message['content'] = attachments.length > 0 
      ? [
          { type: "text", text: userMsg },
          ...attachments.map(url => ({ type: "image_url" as const, image_url: { url } }))
        ]
      : userMsg

    if (userMsg === "是" || userMsg === "执行") {
      const lastAssistantMsg = messages[messages.length - 1]
      if (lastAssistantMsg && lastAssistantMsg.role === "assistant") {
        const jsonMatches = [...(lastAssistantMsg.content as string).matchAll(/```json\s*([\s\S]*?)```/g)]
        if (jsonMatches.length > 0) {
          const commands = []
          for (const match of jsonMatches) {
             try { commands.push(JSON.parse(match[1])) } catch {}
          }
          if (commands.length > 0) await executeCommands(commands)
        }
      }
      return
    }

    const newMessages: Message[] = [...messages, { role: "user", content: userMessageContent }]
    setMessages(newMessages)
    setIsLoading(true)
    setAutoScroll(true)
    const currentAttachments = [...attachments]
    setAttachments([])

    try {
      if (ensuredSessionId) {
        const current = sessions.find((s) => s.id === ensuredSessionId)
        if (current && current.title && current.title.startsWith("新会话")) {
           const cand = userMsg.slice(0, 24)
           await fetch(`/api/sessions/${ensuredSessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cand }) })
           setSessions((prev) => prev.map((s) => (s.id === ensuredSessionId ? { ...s, title: cand } : s)))
        }
        
        await fetch(`/api/sessions/${ensuredSessionId}`, { 
           method: "PUT", 
           headers: { "Content-Type": "application/json" }, 
           body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }) 
        })
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel || aiSettings?.model,
          apiKey: aiSettings?.apiKey,
          apiUrl: aiSettings?.apiUrl,
          systemPrompt: aiSettings?.systemPrompt,
          sessionId: ensuredSessionId,
          enableSearch,
          enableReasoning,
          deviceData,
          weatherData
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to send message: ${res.status} - ${errorText}`)
      }
      
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
              if (typeof content === "string") {
                assistantMsg.content = (typeof assistantMsg.content === "string" ? assistantMsg.content : "") + content
                
                const combined = typeof assistantMsg.content === "string" ? assistantMsg.content : ""
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
                
                setMessages(prev => {
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = { 
                    role: "assistant", 
                    content: display, 
                    reasoning: { text: reasoningText, durationMs: Date.now() - startTs }
                  }
                  return newMsgs
                })
              }
            } catch {}
          }
        }
      }
      
      if (ensuredSessionId) {
         const lastMsg = { ...assistantMsg, reasoning: { text: reasoningText, durationMs: Date.now() - startTs } }
         await fetch(`/api/sessions/${ensuredSessionId}`, { 
           method: "PUT", 
           headers: { "Content-Type": "application/json" }, 
           body: JSON.stringify({ messages: [...newMessages, lastMsg] }) 
        })
      }

    } catch (e) {
      console.error("Chat error:", e)
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，发生了一些错误，请稍后再试。" }])
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsLoading(false), 100)
    }
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
        setMessages([])
        setInput("")
      }
    } catch {}
  }
  
  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.currentTarget.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const url = typeof reader.result === "string" ? reader.result : ""
        if (url) setAttachments((prev) => [...prev, url])
      }
      reader.readAsDataURL(file)
    })
    e.currentTarget.value = ""
    if (files.length > 0) {
      showNotice("附件已添加", `共 ${files.length} 个`, "success")
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }
  
  const handleSettingsSave = (settings: AISettings) => {
    setAiSettings(settings)
    localStorage.setItem("ai-settings", JSON.stringify(settings))
    setSelectedModel(settings.model)
  }

  const renderMessageContent = (msg: Message) => {
    const content = msg.content
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((part, i) => (
            <div key={i}>
              {part.type === 'image_url' && part.image_url && (
                <div className="relative w-full max-w-[300px] h-auto rounded-lg overflow-hidden border border-gray-200 my-2">
                   <Image src={part.image_url.url} alt="User upload" width={300} height={200} className="object-cover w-full h-auto" />
                </div>
              )}
              {part.type === 'text' && part.text && renderTextContent(part.text)}
            </div>
          ))}
        </div>
      )
    }
    return renderTextContent(content)
  }

  const renderTextContent = (content: string) => {
    const parts = content.split(/(<\s*CHART\s+type="echarts"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*REASONING\s*>[\s\S]*?(?:<\/\s*REASONING\s*>|$)|<\s*SOURCES\s*>[\s\S]*?<\/\s*SOURCES\s*>|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*TASKS\s*>[\s\S]*?<\/\s*TASKS\s*>|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TASK_LIST\s*(?:>[\s\S]*?(?:<\/\s*TASK_LIST\s*>|$)|(?:\/>)))/g)

    return (
      <>
        {parts.map((part, index) => {
          if (part.match(/^<\s*TASK_LIST/)) return <div key={index} className="my-6"><ScheduledTasksList /></div>
          if (part.match(/^<\s*CONTROL_BENTO/)) return <div key={index} className="my-6"><ControlBentoGrid /></div>
          if (part.match(/^<\s*DEVICE_BENTO/)) return <div key={index} className="my-6"><DeviceBentoGrid /></div>
          if (part.match(/^<\s*MONITOR/)) return <div key={index} className="flex justify-center my-4"><MonitorCard /></div>

          if (part.match(/^<\s*TASKS/)) {
            try {
              const jsonStr = part.replace(/<\s*TASKS\s*>/, '').replace(/<\/\s*TASKS\s*>/, '').trim()
              const tasks = JSON.parse(jsonStr) as TaskModel[]
              if (!tasks || tasks.length === 0) return null
              return (
                <div key={index} className="my-4 space-y-4">
                  {tasks.map((task, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-medium text-sm text-gray-900">{task.title}</h3>
                        <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide", task.status === 'completed' ? "bg-green-100 text-green-700" : task.status === 'in_progress' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                          {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </div>
                      </div>
                      <div className="p-0">
                        {task.items.map((item, j) => (
                           <div key={j} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                             <div className="mt-0.5 shrink-0 text-gray-400">
                               {item.type === 'file' ? <FileText size={16} /> : <CheckCircle2 size={16} className={cn(task.status === 'completed' ? "text-green-500" : "")} />}
                             </div>
                             <div className="flex-1 text-sm text-gray-600">
                               {item.text}
                               {item.file && (
                                 <div className="mt-2 flex items-center gap-2 p-2 bg-gray-100 rounded-md border border-gray-200 w-fit">
                                    <div className="text-xs font-medium text-gray-700">{item.file.name}</div>
                                 </div>
                               )}
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            } catch { return null }
          }

          if (part.match(/^<\s*CHART/)) {
            try {
              const isVegaLite = part.includes('type="vega-lite"')
              const tagStartRegex = isVegaLite ? /<\s*CHART\s+type="vega-lite"\s*>/ : /<\s*CHART\s+type="echarts"\s*>/
              const jsonStr = part.replace(tagStartRegex, '').replace(/<\/\s*CHART\s*>/, '').trim()
              const data = JSON.parse(jsonStr)
              return (
                <div key={index} className="my-4 w-full min-w-[300px] h-[300px] rounded-lg overflow-hidden bg-white relative z-10 border border-gray-100 shadow-sm">
                  <ChartRenderer options={data} type={isVegaLite ? 'vega-lite' : 'echarts'} style={{ height: '100%', width: '100%' }} />
                </div>
              )
            } catch { return null }
          }

          if (part.match(/^<\s*REASONING/)) {
             const reasoningText = part.replace(/<\s*REASONING\s*>/, '').replace(/<\/\s*REASONING\s*>/, '').trim()
             const isStreaming = !part.match(/<\/\s*REASONING\s*>/)
             if (!reasoningText && !isStreaming) return null
             return (
               <Reasoning key={index} isStreaming={isStreaming} className="mb-4">
                 <ReasoningTrigger />
                 <ReasoningContent>
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{reasoningText}</ReactMarkdown>
                 </ReasoningContent>
               </Reasoning>
             )
          }

          if (part.match(/^<\s*SOURCES/)) {
            try {
              const jsonStr = part.replace(/<\s*SOURCES\s*>/, '').replace(/<\/\s*SOURCES\s*>/, '').trim()
              const sources = JSON.parse(jsonStr) as Array<{ title: string, url: string, number: number }>
              if (!sources || sources.length === 0) return null
              return (
                <div key={index} className="mt-4 mb-2">
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full pl-1 pr-3 py-1 transition-colors cursor-pointer group">
                       <div className="flex -space-x-2 overflow-hidden py-0.5 pl-0.5">
                          {sources.slice(0, 3).map((s, i) => (
                            <div key={i} className="size-5 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm shrink-0 relative z-10">
                               {s.number}
                            </div>
                          ))}
                       </div>
                       <span className="text-sm text-gray-500 font-medium group-hover:text-gray-700">Source</span>
                    </div>
                  </div>
                </div>
              )
            } catch { return null }
          }

          if (!part.trim()) return null

          const commands: any[] = []
          const matches = part.matchAll(/```json\s*([\s\S]*?)```/g)
          for (const match of matches) {
             try {
                const json = JSON.parse(match[1])
                if (json.action === 'toggle_relay' || json.action === 'set_led') commands.push(json)
             } catch {}
          }

          return (
            <div key={index}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ node, inline, className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || '')
                      const language = match ? match[1] : ''
                      const isMermaid = language === 'mermaid'
                      if (!inline && isMermaid) return <MermaidChart chart={String(children).replace(/\n$/, '')} />
                      if (!inline && (!language || language === 'json')) {
                        try {
                          const content = String(children).replace(/\n$/, '')
                          if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                            const data = JSON.parse(content)
                            if (data.action === 'schedule_task') return <ScheduleCard data={data} />
                            if (data && (data.series || (data.xAxis && data.yAxis))) {
                              return (
                                <div className="my-4 w-full min-w-[300px] h-[300px] rounded-lg overflow-hidden bg-white relative z-10 border border-gray-100 shadow-sm">
                                  <ChartRenderer options={data} type="echarts" style={{ height: '100%', width: '100%' }} />
                                </div>
                              )
                            }
                          }
                        } catch {}
                      }
                       return <code className={cn("bg-gray-100 rounded px-1 font-mono text-sm text-gray-800 font-semibold", className)} {...props}>{children}</code>
                    },
                    pre: ({ node, children, ...props }: any) => <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto my-2 border border-gray-200" {...props}>{children}</pre>
                  }}
                >
                  {part}
                </ReactMarkdown>
                
                {commands.length > 0 && (
                   <div className="mt-3 mb-4">
                      <button 
                        onClick={() => executeCommands(commands)}
                        className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-white/20 group-hover:translate-x-[100%] transition-transform duration-700 -skew-x-12 -translate-x-[100%]"></div>
                         <Zap size={18} className="animate-pulse" />
                         <div className="flex flex-col items-start">
                           <span className="text-sm font-bold leading-none">立即执行指令</span>
                           <span className="text-[10px] opacity-80 font-mono mt-0.5">Execute {commands.length} Command{commands.length > 1 ? 's' : ''}</span>
                         </div>
                         <ArrowRight size={16} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                      </button>
                   </div>
                )}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#0B1121] text-foreground overflow-hidden font-sans transition-colors duration-500 flex flex-col">
      {/* Background blobs */}
      <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[60%] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/70 dark:bg-[#0B1121]/70 backdrop-blur-lg border-b border-white/20 dark:border-white/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="size-8 relative flex-shrink-0 rounded-full overflow-hidden bg-white border border-gray-100">
              <Image src="/logo.gif" alt="Logo" width={32} height={32} className="object-cover" unoptimized />
           </div>
           <span className="font-bold text-lg">AI 助手</span>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={createNewSession} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <Plus size={20} />
           </button>
           <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <Settings size={20} />
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-16 pb-20 relative z-10">
         <ScrollArea className="flex-1 px-4">
           <div className="flex flex-col gap-6 pb-32 pt-4">
             {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 space-y-8">
                   <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold">晚上好, {user?.username || '朋友'}</h2>
                      <p className="text-muted-foreground">今天想聊点什么？</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                      {[
                         { icon: <Activity size={16} />, text: "分析环境", action: "分析当前环境数据" },
                         { icon: <Sprout size={16} />, text: "灌溉计划", action: "制定今日灌溉计划" },
                         { icon: <Search size={16} />, text: "病虫害诊断", action: "诊断草莓病害" },
                         { icon: <Zap size={16} />, text: "设备检查", action: "检查设备运行状态" },
                       ].map((item, i) => (
                          <button 
                            key={i}
                            onClick={() => handleSend(item.action)}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white/60 dark:bg-white/5 border border-white/20 rounded-2xl hover:bg-white/80 transition-all"
                          >
                            <span className="text-blue-500">{item.icon}</span>
                            <span className="text-sm font-medium">{item.text}</span>
                          </button>
                       ))}
                   </div>
                </div>
             ) : (
                messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}>
                    {msg.role === "assistant" && (
                      <div className="size-8 flex-shrink-0 rounded-full overflow-hidden bg-white border border-gray-100 mt-1">
                        <Image src="/logo.gif" alt="AI" width={32} height={32} className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-tr-sm" 
                        : "bg-white dark:bg-[#1a1a1a] text-foreground border border-gray-100 dark:border-gray-800 rounded-tl-sm"
                    )}>
                      <div className={cn("prose prose-sm max-w-none dark:prose-invert", msg.role === "user" ? "prose-invert" : "")}>
                        {renderMessageContent(msg)}
                      </div>
                    </div>
                  </div>
                ))
             )}
             {isLoading && (
                <div className="flex gap-3">
                   <div className="size-8 flex-shrink-0 rounded-full overflow-hidden bg-white border border-gray-100 mt-1">
                      <Image src="/logo.gif" alt="AI" width={32} height={32} className="object-cover" unoptimized />
                   </div>
                   <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                      <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="size-2 bg-gray-400 rounded-full animate-bounce"></span>
                   </div>
                </div>
             )}
             <div ref={messagesEndRef} />
           </div>
         </ScrollArea>

         {/* Floating Input Bar */}
         <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
            <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xl rounded-[24px] border border-white/20 shadow-lg p-2 flex flex-col gap-2">
               {attachments.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto px-2 py-1">
                     {attachments.map((url, i) => (
                        <div key={i} className="relative size-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                           <Image src={url} alt="preview" fill className="object-cover" />
                           <button onClick={() => removeAttachment(i)} className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white"><X size={10} /></button>
                        </div>
                     ))}
                  </div>
               )}
               <div className="flex items-center gap-2 pl-2 pr-1">
                  <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-gray-600"><Paperclip size={20} /></button>
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="问点什么..."
                    className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-2 max-h-20 text-sm"
                    rows={1}
                  />
                  <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() && attachments.length === 0}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      (input.trim() || attachments.length > 0) 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "bg-gray-100 text-gray-300"
                    )}
                  >
                     <ArrowUp size={20} />
                  </button>
               </div>
               <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.md" multiple className="hidden" onChange={onSelectFiles} />
            </div>
         </div>
      </div>

      <MobileBottomNav />

      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSettingsSave}
      />
      
      {/* Notifications */}
      <div className="fixed top-20 right-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notices.map(notice => (
          <div key={notice.id} className="pointer-events-auto bg-white dark:bg-[#1a1a1a] rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in">
             {notice.variant === 'loading' && <Loader2 size={20} className="text-blue-500 animate-spin mt-0.5" />}
             {notice.variant === 'success' && <CheckCircle2 size={20} className="text-green-500 mt-0.5" />}
             {notice.variant === 'error' && <AlertCircle size={20} className="text-red-500 mt-0.5" />}
             <div className="flex-1">
                <h3 className="font-medium text-sm">{notice.title}</h3>
                {notice.description && <p className="text-xs text-muted-foreground mt-1">{notice.description}</p>}
             </div>
             <button onClick={() => closeNotice(notice.id)} className="text-gray-400"><X size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}
