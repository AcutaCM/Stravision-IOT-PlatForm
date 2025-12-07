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
  Plus,
  Menu,
  Infinity,
  Mic,
  Image as ImageIcon,
  Camera,
  Rocket,
  Trash,
  History
} from "lucide-react"
import MermaidChart from "@/components/mermaid-chart"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import ChartRenderer from "@/components/chart-renderer"
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  Conversation,
  ConversationContent,
} from "@/components/ui/assistant-ui"

import { MobileAISettingsModal } from "@/components/mobile-ai-settings-modal"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { cn } from "@/lib/utils"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai/reasoning"
import { MonitorCard } from "@/components/ai/monitor-card"
import { DeviceBentoGrid } from "@/components/ai/device-bento-grid"
import { ControlBentoGrid } from "@/components/ai/control-bento-grid"
import { ScheduleCard } from "@/components/ai/schedule-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"

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
  const [sheetOpen, setSheetOpen] = useState(false)
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
        setSheetOpen(false)
      }
    } catch {}
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id))
        if (sessionId === id) {
          setSessionId("")
          setMessages([])
          createNewSession()
        }
        showNotice("会话已删除", undefined, "success")
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
                          {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待处理'}
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
                       <span className="text-sm text-gray-500 font-medium group-hover:text-gray-700">来源</span>
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
                           <span className="text-[10px] opacity-80 font-mono mt-0.5">执行 {commands.length} 个指令</span>
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
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-[#0B1121] text-foreground overflow-hidden font-sans transition-colors duration-500 flex flex-col fixed inset-0">
      {/* Background blobs */}
      <div className="fixed top-[-20%] right-[-20%] w-[80%] h-[60%] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/70 dark:bg-[#0B1121]/70 backdrop-blur-lg px-6 flex items-center justify-between">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <Menu size={24} className="text-gray-800 dark:text-gray-200" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 border-r border-gray-200 dark:border-gray-800">
            <div className="flex flex-col h-full bg-white dark:bg-[#0B1121]">
              <div className="p-6 pb-4">
                <button 
                  onClick={() => createNewSession()}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <Plus size={20} strokeWidth={2.5} />
                  <span className="font-semibold tracking-wide">新建对话</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto px-3 pb-6">
                <div className="px-3 py-2 mb-2 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <History size={12} />
                  <span>历史记录</span>
                </div>
                <div className="space-y-1">
                  {sessions.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => { setSessionId(s.id); setSheetOpen(false) }}
                      className={cn(
                        "group flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200",
                        sessionId === s.id 
                          ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium" 
                          : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      <span className="text-sm truncate flex-1 pr-4 leading-none">{s.title}</span>
                      <button 
                        onClick={(e) => deleteSession(s.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">
                      暂无历史记录
                    </div>
                  )}
                </div>
              </div>
              
              {/* User Profile in Sidebar */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 px-2">
                  <Avatar className="size-9 border border-gray-200 dark:border-gray-700">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{user?.username || '用户'}</div>
                    <div className="text-xs text-gray-500 truncate">专业版</div>
                  </div>
                  <button onClick={() => setSettingsOpen(true)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <Settings size={18} />
                  </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-3 font-serif text-xl font-medium tracking-wide">
           <div className="relative size-8 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
             <Image src="/logo.gif" alt="Logo" fill className="object-cover" unoptimized />
           </div>
           <span>你好, {user?.username || '朋友'}!</span>
        </div>

        <button onClick={() => setSettingsOpen(true)} className="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
           <Infinity size={24} className="text-gray-800 dark:text-gray-200" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-16 relative z-10 min-h-0">
         <ScrollArea className="flex-1 px-4 h-full">
           <div className="flex flex-col gap-6 pb-48 pt-4">
             {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 space-y-10">
                   {/* Central Logo */}
                   <div className="relative w-48 h-48 mx-auto my-8 flex items-center justify-center">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                      <Image 
                        src="/logo.gif" 
                        alt="App Logo" 
                        width={192} 
                        height={192} 
                        className="object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500" 
                        unoptimized
                      />
                   </div>

                   {/* Greeting Text */}
                   <h2 className="text-3xl font-serif text-center leading-tight text-gray-800 dark:text-gray-100 max-w-[280px]">
                      您的草莓大棚<br/>智能管家
                   </h2>
                   
                   {/* Action Chips */}
                   <div className="flex gap-3 overflow-x-auto w-full max-w-sm justify-center py-2 no-scrollbar px-4">
                      <button onClick={() => handleSend("分析当前大棚环境数据")} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all whitespace-nowrap flex-shrink-0">
                         <Activity size={16} className="text-purple-500" />
                         <span className="text-sm font-medium">环境分析</span>
                      </button>
                      <button onClick={() => handleSend("检查所有设备运行状态")} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all whitespace-nowrap flex-shrink-0">
                         <Zap size={16} className="text-blue-500" />
                         <span className="text-sm font-medium">设备检查</span>
                      </button>
                      <button onClick={() => handleSend("草莓常见病害有哪些？")} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all whitespace-nowrap flex-shrink-0">
                         <Search size={16} className="text-green-500" />
                         <span className="text-sm font-medium">病害咨询</span>
                      </button>
                       <button onClick={() => handleSend("制定今天的灌溉计划")} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all whitespace-nowrap flex-shrink-0">
                         <Sprout size={16} className="text-amber-500" />
                         <span className="text-sm font-medium">灌溉计划</span>
                      </button>
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
                      "max-w-[85%] min-w-0 break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-tr-sm" 
                        : "bg-white dark:bg-[#1a1a1a] text-foreground border border-gray-100 dark:border-gray-800 rounded-tl-sm"
                    )}>
                      <div className={cn("prose prose-sm max-w-none dark:prose-invert break-words", msg.role === "user" ? "prose-invert" : "")}>
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
         <div className="fixed bottom-[88px] left-0 right-0 px-4 z-40">
            <div className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl rounded-[32px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 p-2 flex flex-col gap-2 relative">
               {attachments.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto px-4 py-2">
                     {attachments.map((url, i) => (
                        <div key={i} className="relative size-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                           <Image src={url} alt="preview" fill className="object-cover" />
                           <button onClick={() => removeAttachment(i)} className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white"><X size={10} /></button>
                        </div>
                     ))}
                  </div>
               )}
               
               <div className="flex flex-col gap-2 p-2">
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="输入关于草莓种植的问题..."
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none px-2 py-1 min-h-[44px] text-base placeholder:text-gray-400"
                    rows={1}
                  />
                  
                  <div className="flex items-center justify-between px-1">
                     <div className="flex items-center gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 transition-colors">
                           <Paperclip size={20} />
                        </button>
                        <PromptInputModelSelect value={selectedModel || aiSettings?.model || "qwen-vl-plus"} onValueChange={(val) => {
                           setSelectedModel(val)
                           if (aiSettings) {
                              const newSettings = { ...aiSettings, model: val }
                              setAiSettings(newSettings)
                              localStorage.setItem("ai-settings", JSON.stringify(newSettings))
                           } else {
                              const defaultSettings = {
                                 apiKey: "",
                                 apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
                                 model: val,
                                 systemPrompt: ""
                              }
                              setAiSettings(defaultSettings)
                              localStorage.setItem("ai-settings", JSON.stringify(defaultSettings))
                           }
                        }}>
                           <PromptInputModelSelectTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors border-0 shadow-none h-auto">
                              <Rocket size={16} />
                              <span className="text-sm font-medium max-w-[80px] truncate">{selectedModel || aiSettings?.model || "自动"}</span>
                              <ChevronDown size={14} />
                           </PromptInputModelSelectTrigger>
                           <PromptInputModelSelectContent className="w-[200px] mb-2" align="start" side="top">
                              <PromptInputModelSelectItem value="qwen3-vl-plus">Qwen3 VL Plus</PromptInputModelSelectItem>
                              <PromptInputModelSelectItem value="qwen3-vl-flash">Qwen3 VL Flash</PromptInputModelSelectItem>
                              <PromptInputModelSelectItem value="qwen3-max">Qwen3 Max</PromptInputModelSelectItem>
                              <PromptInputModelSelectItem value="qwen3-flash">Qwen3 Flash</PromptInputModelSelectItem>
                           </PromptInputModelSelectContent>
                        </PromptInputModelSelect>
                     </div>

                     <button 
                        onClick={() => handleSend()}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                          (input.trim() || attachments.length > 0) 
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-lg hover:shadow-xl active:scale-95" 
                            : "bg-gray-100 dark:bg-white/10 text-gray-400"
                        )}
                     >
                        {(input.trim() || attachments.length > 0) ? (
                           <>
                              <ArrowUp size={18} />
                              <span className="font-medium text-sm">发送</span>
                           </>
                        ) : (
                           <>
                              <Mic size={18} />
                              <span className="font-medium text-sm">语音</span>
                           </>
                        )}
                     </button>
                  </div>
               </div>
               
               <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.md" multiple className="hidden" onChange={onSelectFiles} />
            </div>
         </div>
      </div>

      <MobileAISettingsModal
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
