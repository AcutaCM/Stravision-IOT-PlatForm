"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import {
  Mic,
  RotateCcw,
  Copy,
  Trash,
  Settings,
  Plus,
  LogOut,
  X,
  ChevronDown,
  SquarePen,
  Search,
  Library,
  Sparkles,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  ArrowUp,
  ImageIcon,
  Paperclip,
  FileText,
  Sun,
  Activity,
  Sprout,
  Zap,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Download
} from "lucide-react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import remarkGfm from "remark-gfm"
import * as htmlToImage from 'html-to-image'
import jsPDF from "jspdf"

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })
const MermaidChart = dynamic(() => import("@/components/mermaid-chart"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-gray-400">Loading diagram...</div>
})

const ChartRenderer = dynamic(() => import("@/components/chart-renderer"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-gray-400">Loading chart...</div>
})

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  Conversation,
  ConversationContent,
  Loader,
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
import { SpectralCard } from "@/components/ai/spectral-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { PageNavigation } from "@/components/page-navigation"


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

function isVLMModel(model: string | undefined): boolean {
  if (!model) return false
  const m = model.toLowerCase()
  return (
    m.includes('vision') ||
    m.includes('-vl-') ||
    /qwen\d*-vl/.test(m) ||
    m.includes('qwen-vl') ||
    m.includes('qwen3-vl') ||
    m.includes('qvq')
  )
}

interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number }

export default function AIAssistantPage() {
  const router = useRouter()
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
  const [enableReasoning, setEnableReasoning] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [attachments, setAttachments] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()
  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading' | 'success' | 'error'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)

  const showNotice = (title: string, description?: string, variant?: 'loading' | 'success' | 'error') => {
    const id = ++noticeIdCounter.current
    setNotices(prev => [...prev, { id, title, description, variant, expanded: false }])

    if (variant && variant !== 'loading') {
      setTimeout(() => {
        setNotices(prev => prev.filter(n => n.id !== id))
      }, 5000)
    }
  }

  const handleOptimizePrompt = async () => {
    if (!input.trim()) return
    if (!aiSettings?.apiKey) { setSettingsOpen(true); return }
    
    setIsOptimizing(true)
    showNotice("正在优化提示词...", "AI 正在思考如何改进您的输入...", "loading")
    try {
      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          apiKey: aiSettings.apiKey,
          apiUrl: aiSettings.apiUrl,
          model: aiSettings.model
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.optimizedPrompt) {
          setInput(data.optimizedPrompt)
          showNotice("提示词已优化", "已为您重写了更清晰的提示词", "success")
        }
      } else {
        showNotice("优化失败", "请求出错", "error")
      }
    } catch (e) {
      console.error("Optimize error", e)
      showNotice("优化失败", "发生未知错误", "error")
    } finally {
      setIsOptimizing(false)
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
      ; (async () => {
        try {
          const res = await fetch("/api/auth/me")
          const data = await res.json()
          if (mounted && data?.authenticated && data?.user) setUser(data.user as UserPublic)
        } catch { }
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
    } catch { }
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
      } catch { }
    })()
  }, [])

  // Load Messages
  useEffect(() => {
    if (!sessionId) return
    localStorage.setItem("ai-last-session-id", sessionId)
      ; (async () => {
        try {
          const res = await fetch(`/api/sessions/${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            const msgs = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
            setMessages(msgs.length > 0 ? msgs : [])
            try {
              const draft = localStorage.getItem(`ai-input-draft-${sessionId}`)
              if (typeof draft === "string") setInput(draft)
            } catch { }
          }
        } catch { }
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
            try { const j = await res.json(); err = j?.error || '' } catch { }
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
            try { const j = await res.json(); err = j?.error || '' } catch { }
            showNotice("开关执行失败", err || `请求错误 ${res.status}`, "error")
          }
        }
        // Add a small delay between commands to avoid flooding
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
    setEnableSearch(false) // Reset search state after sending

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
            try { commands.push(JSON.parse(match[1])) } catch { }
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
                // Simplified reasoning parsing
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
            } catch { }
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
      // Ensure loading state is cleared
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
    } catch { }
  }

  const deleteSession = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm("确定要删除此会话吗？")) return
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      const nextSessions = sessions.filter(s => s.id !== id)
      setSessions(nextSessions)
      if (id === sessionId) {
        if (nextSessions.length > 0) setSessionId(nextSessions[0].id)
        else createNewSession()
      }
    } catch { }
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

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    const files: File[] = []
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }
    
    if (files.length > 0) {
      e.preventDefault()
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = () => {
          const url = typeof reader.result === "string" ? reader.result : ""
          if (url) setAttachments((prev) => [...prev, url])
        }
        reader.readAsDataURL(file)
      })
      showNotice("已粘贴附件", `共 ${files.length} 个文件`, "success")
    }
  }

  const handleDownloadPDF = async (messageIndex: number) => {
    const element = document.getElementById(`message-content-${messageIndex}`)
    if (!element) return

    showNotice("正在生成 PDF...", "请稍候，这可能需要几秒钟", "loading")

    try {
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        style: {
          // 强制覆盖可能出问题的颜色属性，虽然 html-to-image 对 lab 支持更好，但防患于未然
          color: '#000000',
        }
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const img = new window.Image()
      img.src = dataUrl
      await new Promise((resolve) => { img.onload = resolve })

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (img.height * imgWidth) / img.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`AI-Assistant-Report-${new Date().toISOString().slice(0, 10)}.pdf`)
      showNotice("PDF 生成成功", "文件已开始下载", "success")
    } catch (error) {
      console.error("PDF Generation Error:", error)
      showNotice("PDF 生成失败", "请重试或检查内容是否包含复杂元素", "error")
    }
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
    // Split content by CHART, REASONING, and SOURCES tags
    // Improved regex to handle multiline content correctly using [\s\S]*? non-greedy match
    // Updated to handle streaming REASONING tags (open tag without close tag yet)
    // Updated to handle spaces in tags (e.g. < TASK_LIST >)
    const parts = content.split(/(<\s*CHART\s+type="echarts"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*REASONING\s*>[\s\S]*?(?:<\/\s*REASONING\s*>|$)|<\s*SOURCES\s*>[\s\S]*?<\/\s*SOURCES\s*>|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*SPECTRAL\s*>[\s\S]*?(?:<\/\s*SPECTRAL\s*>|$)|<\s*TASKS\s*>[\s\S]*?<\/\s*TASKS\s*>|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TASK_LIST\s*(?:>[\s\S]*?(?:<\/\s*TASK_LIST\s*>|$)|(?:\/>)))/g)

    return (
      <>
        {parts.map((part, index) => {
          if (part.match(/^<\s*SPECTRAL/)) {
            return (
              <div key={index} className="flex justify-center my-4 w-full">
                <div className="w-full max-w-[400px]">
                  <SpectralCard data={deviceData} />
                </div>
              </div>
            )
          }

          if (part.match(/^<\s*TASK_LIST/)) {
            return (
              <div key={index} className="my-6">
                <ScheduledTasksList />
              </div>
            )
          }

          if (part.match(/^<\s*CONTROL_BENTO/)) {
            return (
              <div key={index} className="my-6">
                <ControlBentoGrid />
              </div>
            )
          }

          if (part.match(/^<\s*DEVICE_BENTO/)) {
            return (
              <div key={index} className="my-6">
                <DeviceBentoGrid />
              </div>
            )
          }

          if (part.match(/^<\s*TASKS/)) {
            try {
              const jsonStr = part.replace(/<\s*TASKS\s*>/, '').replace(/<\/\s*TASKS\s*>/, '').trim()
              const tasks = JSON.parse(jsonStr) as TaskModel[]

              if (!tasks || tasks.length === 0) return null

              return (
                <div key={index} className="my-4 space-y-4">
                  {tasks.map((task, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{task.title}</h3>
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
                          task.status === 'completed' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                            task.status === 'in_progress' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                              "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400"
                        )}>
                          {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </div>
                      </div>
                      <div className="p-0">
                        {task.items.map((item, j) => (
                          <div key={j} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                            <div className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
                              {item.type === 'file' ? <FileText size={16} /> : <CheckCircle2 size={16} className={cn(task.status === 'completed' ? "text-green-500" : "")} />}
                            </div>
                            <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                              {item.text}
                              {item.file && (
                                <div className="mt-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-zinc-800 rounded-md border border-gray-200 dark:border-gray-700 w-fit">
                                  <div className="size-8 bg-white dark:bg-zinc-900 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                    {item.file.name.split('.').pop()}
                                  </div>
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.file.name}</div>
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
            } catch (e) {
              console.error("Tasks parsing error", e)
              return null
            }
          }

          if (part.match(/^<\s*MONITOR/)) {
            return (
              <div key={index} className="flex justify-center my-4">
                <MonitorCard />
              </div>
            )
          }

          if (part.match(/^<\s*CHART/)) {
            try {
              // Extract type and content
              const isVegaLite = part.includes('type="vega-lite"')
              const tagStartRegex = isVegaLite ? /<\s*CHART\s+type="vega-lite"\s*>/ : /<\s*CHART\s+type="echarts"\s*>/

              // Extract JSON content
              const jsonStr = part.replace(tagStartRegex, '').replace(/<\/\s*CHART\s*>/, '').trim()
              const data = JSON.parse(jsonStr)

              return (
                <div key={index} className="my-4 w-full min-w-[300px] md:min-w-[600px] h-[350px] rounded-lg overflow-hidden bg-white relative z-10 border border-gray-100 shadow-sm">
                  <ChartRenderer options={data} type={isVegaLite ? 'vega-lite' : 'echarts'} style={{ height: '100%', width: '100%' }} />
                </div>
              )
            } catch (e) {
              // Fallback to showing raw text if parsing fails
              console.error("Chart parsing error", e)
              return (
                <div key={index} className="p-4 bg-red-50 text-red-500 rounded-lg border border-red-100 text-xs font-mono overflow-auto">
                  Chart Error: {String(e)}
                </div>
              )
            }
          }

          if (part.match(/^<\s*REASONING/)) {
            const reasoningText = part.replace(/<\s*REASONING\s*>/, '').replace(/<\/\s*REASONING\s*>/, '').trim()

            // Check if the reasoning block is closed
            const isStreaming = !part.match(/<\/\s*REASONING\s*>/)

            // If content is empty AND NOT streaming, hide it.
            // But if streaming (even if empty), show it.
            if (!reasoningText && !isStreaming) return null

            return (
              <Reasoning key={index} isStreaming={isStreaming} className="mb-4">
                <ReasoningTrigger />
                <ReasoningContent>
                  {reasoningText ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ node, inline, className, children, ...props }: any) => (
                          <code className={cn("bg-gray-100 dark:bg-zinc-800 rounded px-1 font-mono text-xs text-gray-800 dark:text-gray-200 font-semibold", className)} {...props}>{children}</code>
                        )
                      }}
                    >
                      {reasoningText}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                      <span className="size-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="size-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="size-2 bg-current rounded-full animate-bounce"></span>
                    </div>
                  )}
                </ReasoningContent>
              </Reasoning>
            )
          }

          if (part.match(/^<\s*SOURCES/)) {
            try {
              const jsonStr = part.replace(/<\s*SOURCES\s*>/, '').replace(/<\/\s*SOURCES\s*>/, '').trim()
              let sources: Array<{ title: string, url: string, number: number }> = []

              if (jsonStr.startsWith('[')) {
                try {
                  sources = JSON.parse(jsonStr)
                } catch (e) {
                  console.warn("Sources JSON parse failed, attempting regex fallback")
                }
              }

              if (!sources || sources.length === 0) {
                // Fallback for Markdown style links: [Title](URL)
                const regex = /\[([^\]]+)\]\(([^)]+)\)/g
                let match
                let idx = 1
                while ((match = regex.exec(jsonStr)) !== null) {
                  sources.push({
                    title: match[1],
                    url: match[2],
                    number: idx++
                  })
                }
              }

              if (!sources || sources.length === 0) return null

              return (
                <div key={index} className="mt-4 mb-2">
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-gray-700 rounded-full pl-1 pr-3 py-1 transition-colors cursor-pointer group">
                      <div className="flex -space-x-2 overflow-hidden py-0.5 pl-0.5">
                        {sources.slice(0, 3).map((s, i) => (
                          <div key={i} className="size-5 rounded-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 shadow-sm shrink-0 relative z-10">
                            {/* Try to use favicon if available, otherwise show number */}
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${new URL(s.url).hostname}&sz=32`}
                              alt=""
                              className="size-3.5 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.parentElement!.innerText = String(s.number)
                              }}
                            />
                          </div>
                        ))}
                        {sources.length > 3 && (
                          <div className="size-5 rounded-full bg-gray-100 dark:bg-zinc-800 border border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-gray-400 z-0">
                            +{sources.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium group-hover:text-gray-700 dark:group-hover:text-gray-300">Source</span>
                    </div>
                  </div>
                </div>
              )
            } catch (e) {
              console.error("Sources parsing error", e)
              return null
            }
          }

          if (!part.trim()) return null

          const commands: any[] = []
          const matches = part.matchAll(/```json\s*([\s\S]*?)```/g)
          for (const match of matches) {
            try {
              const json = JSON.parse(match[1])
              if (json.action === 'toggle_relay' || json.action === 'set_led') {
                commands.push(json)
              }
            } catch { }
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

                    if (!inline && isMermaid) {
                      return <MermaidChart chart={String(children).replace(/\n$/, '')} />
                    }

                    // Try to parse JSON and check if it's an ECharts option or Schedule Task
                    if (!inline && (!language || language === 'json')) {
                      try {
                        const content = String(children).replace(/\n$/, '')
                        if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                          const data = JSON.parse(content)

                          // Check for Schedule Task
                          if (data.action === 'schedule_task') {
                            return <ScheduleCard data={data} />
                          }

                          // Basic check for ECharts structure
                          if (data && (data.series || (data.xAxis && data.yAxis))) {
                            return (
                              <div className="my-4 w-full min-w-[300px] md:min-w-[600px] h-[350px] rounded-lg overflow-hidden bg-white dark:bg-zinc-900 relative z-10 border border-gray-100 dark:border-gray-800 shadow-sm">
                                <ChartRenderer options={data} type="echarts" style={{ height: '100%', width: '100%' }} />
                              </div>
                            )
                          }
                        }
                      } catch (e) {
                        // Not valid JSON or not a chart, continue to render as code
                      }
                    }

                    return <code className={cn("bg-gray-100 dark:bg-zinc-800 rounded px-1 font-mono text-sm text-gray-800 dark:text-gray-200 font-semibold", className)} {...props}>{children}</code>
                  },
                  pre: ({ node, children, ...props }: any) => <pre className="bg-gray-50 dark:bg-zinc-900 p-3 rounded-lg overflow-x-auto my-2 border border-gray-200 dark:border-gray-800" {...props}>{children}</pre>,
                  table: ({ children }: any) => <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-800"><table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">{children}</table></div>,
                  thead: ({ children }: any) => <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-900 dark:text-gray-400 font-semibold">{children}</thead>,
                  tbody: ({ children }: any) => <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-transparent">{children}</tbody>,
                  tr: ({ children }: any) => <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">{children}</tr>,
                  th: ({ children }: any) => <th className="px-6 py-3 whitespace-nowrap">{children}</th>,
                  td: ({ children }: any) => <td className="px-6 py-4">{children}</td>,
                  ul: ({ children }: any) => <ul className="list-disc list-inside my-2 space-y-1 ml-2">{children}</ul>,
                  ol: ({ children }: any) => <ol className="list-decimal list-inside my-2 space-y-1 ml-2">{children}</ol>,
                  li: ({ children }: any) => <li className="text-gray-700 dark:text-gray-300">{children}</li>,
                  blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 italic bg-blue-50/50 dark:bg-blue-900/10 rounded-r text-gray-600 dark:text-gray-400">{children}</blockquote>,
                  h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100">{children}</h1>,
                  h2: ({ children }: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-800">{children}</h2>,
                  h3: ({ children }: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">{children}</h3>,
                  a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline decoration-blue-300 underline-offset-2">{children}</a>
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

  const groupedSessions = sessions.reduce((acc, session) => {
    const date = new Date(session.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let key = "Earlier"
    if (date.toDateString() === today.toDateString()) key = "Today"
    else if (date.toDateString() === yesterday.toDateString()) key = "Yesterday"
    else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) key = "Previous 7 Days"

    if (!acc[key]) acc[key] = []
    acc[key].push(session)
    return acc
  }, {} as Record<string, SessionMeta[]>)

  const groupOrder = ["Today", "Yesterday", "Previous 7 Days", "Earlier"]

  return (
    <div className="fixed inset-0 w-full h-full bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 font-sans overflow-hidden flex">
      {/* Sidebar */}
      <div className={cn(
        "flex-shrink-0 bg-[#f9f9f9] dark:bg-zinc-900 flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 relative",
        sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden"
      )}>
        {/* Top Nav Items */}
        <div className="p-3 space-y-1">
          {/* Logo Section */}
          <div className="flex items-center gap-2 px-2 py-3 mb-1">
            <div className="size-16 relative flex-shrink-0 rounded-full overflow-hidden bg-white dark:bg-zinc-800 border border-gray-100 dark:border-gray-700">
              <Image src="/logo.gif" alt="Logo" width={64} height={64} className="object-cover" unoptimized />
            </div>
            <div className="h-8 w-26 relative flex-shrink-0">
              <Image src="/logo-chat.svg" alt="Logo Text" fill className="object-contain object-left dark:invert" />
            </div>
          </div>

          <div className="flex items-center justify-between px-2 py-2 mb-2">
            <button
              onClick={createNewSession}
              className="flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg px-2 py-1 transition-colors text-sm font-medium w-full text-gray-700 dark:text-gray-300"
            >
              <SquarePen size={18} />
              <span>新会话</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 md:hidden">
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* Mock Nav Items */}
          <div className="space-y-1">
            {/* Search */}
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left">
              <Search size={18} />
              <span>搜索会话</span>
            </button>

            {/* Return Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left"
            >
              <ArrowLeft size={18} />
              <span>返回</span>
            </button>
          </div>
        </div>

        {/* Scrollable Chat History */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <div className="flex flex-col gap-4 pb-4 pt-2">
            {groupOrder.map(key => {
              const group = groupedSessions[key]
              if (!group || group.length === 0) return null
              return (
                <div key={key}>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3">{key === "Today" ? "今天" : key === "Yesterday" ? "昨天" : key === "Previous 7 Days" ? "过去7天" : "更早"}</div>
                  <div className="flex flex-col gap-0.5">
                    {group.map(s => (
                      <div
                        key={s.id}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm overflow-hidden relative",
                          sessionId === s.id ? "bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100" : "hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300"
                        )}
                        onClick={() => { setSessionId(s.id); if (window.innerWidth < 768) setSidebarOpen(false) }}
                      >
                        <div className="flex-1 truncate relative z-10">
                          {s.title}
                        </div>
                        {sessionId === s.id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
                            <button onClick={(e) => deleteSession(s.id, e)} className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-1 rounded-md transition-colors"><Trash size={14} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom User/Upgrade */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 mt-auto">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left">
                <Avatar className="size-8 border border-gray-200 dark:border-gray-700">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-green-600 text-white text-xs">{user?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate font-medium">{user?.username || "User"}</div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" side="top">
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setSettingsOpen(true)}>
                <Settings size={16} /> 设置
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 text-red-600" onClick={() => router.push('/login')}>
                <LogOut size={16} /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
          {notices.map(notice => (
            <div key={notice.id} className="pointer-events-auto w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in slide-in-from-right-full fade-in duration-300">
              {/* Header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  {notice.variant === 'loading' ? (
                    <Loader2 size={20} className="text-blue-500 animate-spin" />
                  ) : notice.variant === 'success' ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : notice.variant === 'error' ? (
                    <AlertCircle size={20} className="text-red-500" />
                  ) : (
                    <Sparkles size={20} className="text-gray-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-[15px] leading-tight">{notice.title}</h3>
                  {notice.expanded && notice.description && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed break-words">{notice.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 -mt-1 -mr-1 shrink-0">
                  {notice.description && (
                    <button
                      onClick={() => toggleNoticeExpanded(notice.id)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ChevronDown size={16} className={cn("transition-transform duration-200", notice.expanded ? "rotate-180" : "")} />
                    </button>
                  )}
                  <button
                    onClick={() => closeNotice(notice.id)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Footer / Collapsed Description */}
              {!notice.expanded && notice.description && (
                <div className="bg-gray-50/80 dark:bg-zinc-800/80 px-4 py-3 border-t border-gray-100/50 dark:border-gray-800/50">
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-normal line-clamp-2">
                    {notice.description}
                  </p>
                </div>
              )}

              {/* Progress Bar for Auto-close */}
              {notice.variant !== 'loading' && (
                <div className="h-1 w-full bg-gray-100/50 dark:bg-zinc-800/50">
                  <div className="h-full bg-green-500 origin-left animate-[shrink_5s_linear_forwards]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-zinc-950">
        {/* Top Bar */}
        <div className="h-14 flex items-center justify-between px-4 sticky top-0 z-10 bg-white dark:bg-zinc-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800">
                <PanelLeftOpen size={20} />
              </button>
            )}
            {sidebarOpen && (
              <button id="ai-sidebar-toggle" onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 md:hidden">
                <PanelLeftClose size={20} />
              </button>
            )}

            <div id="ai-model-selector-nav">
            <PromptInputModelSelect value={selectedModel || aiSettings?.model || "qwen-vl-plus"} onValueChange={(val) => {
              setSelectedModel(val)
              if (aiSettings) {
                const newSettings = { ...aiSettings, model: val }
                setAiSettings(newSettings)
                localStorage.setItem("ai-settings", JSON.stringify(newSettings))
              } else {
                // If no settings yet, create default with this model
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
              <PromptInputModelSelectTrigger className="bg-transparent border-0 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 gap-1 px-2 py-1.5 rounded-lg transition-colors shadow-none focus:ring-0 h-auto">
                <span className="text-gray-600 dark:text-gray-400 font-semibold text-lg">{selectedModel || aiSettings?.model || "Qwen"}</span>
                <ChevronDown size={16} className="text-gray-400 ml-1" />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent className="w-[200px]">
                <PromptInputModelSelectItem value="qwen3-vl-plus">Qwen3 VL Plus</PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3-vl-flash">Qwen3 VL Flash</PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3-max">Qwen3 Max</PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3-flash">Qwen3 Flash</PromptInputModelSelectItem>
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Placeholder for 'Get Plus' if needed, sticking to minimal for now or user avatar if not in sidebar */}
            {/* In design, User Avatar is top right of Main Area. I'll put it here too as an alternative or primary access. */}
            <Avatar className="size-8 border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback className="bg-green-600 text-white text-xs">{user?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Chat Area */}
        <div id="ai-welcome-area" className="flex-1 min-h-0 relative flex flex-col overflow-y-auto custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center p-4 min-h-[600px]">
              <div className="w-full max-w-5xl flex flex-col items-center m-auto py-20">
              {/* Header */}
              <div className="text-center mb-10 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  晚上好，{user?.username || '农场主'}
                </h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">
                  今天想为您的农场做些什么？
                </p>
              </div>

              {/* Input Bar in Center for Empty State */}
              <div className="w-full max-w-4xl relative mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                <div className="bg-white dark:bg-zinc-900 rounded-[24px] px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-all duration-300 border border-gray-100 dark:border-gray-800 group">
                  {attachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2 mb-2">
                      {attachments.map((url, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group/img shrink-0">
                          <Image src={url} alt="upload" fill className="object-cover" />
                          <button onClick={() => removeAttachment(i)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 text-white transition-opacity"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      onPaste={handlePaste}
                      placeholder="问点什么..."
                      className="w-full bg-transparent border-0 focus:ring-0 resize-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400 text-lg leading-relaxed py-2"
                      rows={1}
                      style={{ minHeight: '44px', maxHeight: '200px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                      }}
                    />
                    {input.trim() && (
                      <button
                        onClick={handleSend}
                        className="self-end mb-1 p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all active:scale-95 shadow-md"
                      >
                        <ArrowUp size={20} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
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
                        <PromptInputModelSelectTrigger id="ai-model-selector-empty" className="bg-gray-50 dark:bg-zinc-800 border-0 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 gap-1.5 px-3 py-1.5 rounded-lg transition-colors shadow-none focus:ring-0 h-auto text-xs font-semibold uppercase tracking-wide">
                          <span>{selectedModel || aiSettings?.model || "模型"}</span>
                          <ChevronDown size={12} className="text-gray-400" />
                        </PromptInputModelSelectTrigger>
                        <PromptInputModelSelectContent className="w-[200px]">
                          <PromptInputModelSelectItem value="qwen3-vl-plus">Qwen3 VL Plus</PromptInputModelSelectItem>
                          <PromptInputModelSelectItem value="qwen3-vl-flash">Qwen3 VL Flash</PromptInputModelSelectItem>
                          <PromptInputModelSelectItem value="qwen3-max">Qwen3 Max</PromptInputModelSelectItem>
                          <PromptInputModelSelectItem value="qwen3-flash">Qwen3 Flash</PromptInputModelSelectItem>
                        </PromptInputModelSelectContent>
                      </PromptInputModelSelect>
                    </div>
                    <div id="ai-tools-empty" className="flex items-center gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="上传文件"
                      >
                        <Paperclip size={20} />
                      </button>
                      <button
                        onClick={() => setEnableSearch(!enableSearch)}
                        className={cn("transition-colors", enableSearch ? "text-blue-500" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
                        title="联网搜索"
                      >
                        <Globe size={20} />
                      </button>
                      <button
                        onClick={() => setEnableReasoning(!enableReasoning)}
                        className={cn("transition-colors", enableReasoning ? "text-purple-500" : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
                        title="深度思考"
                      >
                        <Sparkles size={20} />
                      </button>
                    </div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.md" multiple className="hidden" onChange={onSelectFiles} />
              </div>

              {/* Quick Actions */}
              <div id="ai-quick-actions" className="flex flex-wrap justify-center gap-3 mb-10 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                {[
                  { icon: <Activity size={16} />, text: "分析环境数据", action: "分析当前环境数据" },
                  { icon: <Sprout size={16} />, text: "制定灌溉计划", action: "制定今日灌溉计划" },
                  { icon: <Search size={16} />, text: "诊断病虫害", action: "诊断草莓病害" },
                  { icon: <SquarePen size={16} />, text: "生成种植周报", action: "生成本周种植报告" },
                  { icon: <Zap size={16} />, text: "检查设备状态", action: "检查设备运行状态" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.action)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm hover:shadow-md"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    {item.text}
                  </button>
                ))}
              </div>

              {/* Widgets Grid */}
              <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                {/* Weather Widget */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-48 relative overflow-hidden group hover:shadow-lg transition-all">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sun size={80} className="text-amber-500" />
                  </div>
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 font-medium mb-1">
                        <span>宁波</span>
                        <ChevronDown size={14} />
                      </div>
                      <div className="text-5xl font-bold text-gray-800 dark:text-gray-100 tracking-tight mt-2">
                        {weatherData?.current?.temp_c || "--"}°C
                      </div>
                    </div>
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full text-amber-600 dark:text-amber-500">
                      <Sun size={24} />
                    </div>
                  </div>
                  <div className="flex justify-between items-end z-10">
                    <div className="text-gray-400 text-sm">
                      {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="text-right">
                      <div className="text-amber-500 font-medium">晴朗</div>
                      <div className="text-xs text-gray-400">高:24° 低:18°</div>
                    </div>
                  </div>
                </div>

                {/* Context-Aware Promo */}
                <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-3xl p-6 border border-blue-100 dark:border-blue-900 relative overflow-hidden group">
                  <div className="absolute top-4 right-4">
                    <span className="bg-white/80 dark:bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider border border-blue-100 dark:border-blue-800">新功能</span>
                  </div>
                  <div className="relative z-10 h-full flex flex-col justify-center items-start max-w-md">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">智能种植助手</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                      您的 AI 助手现在可以根据实时传感器数据，自动分析环境状况并提供精准的调控建议。不仅如此，它还能为您生成可视化的数据图表。
                    </p>
                    <button onClick={() => handleSend("分析当前环境数据")} className="text-blue-600 dark:text-blue-400 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all group-hover:underline">
                      尝试分析环境 <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Recent Chats / Suggestions */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all h-48 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm font-medium">
                    <RotateCcw size={14} />
                    <span>最近活动</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="group cursor-pointer" onClick={() => handleSend("检查灌溉系统状态")}>
                      <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">灌溉系统检查</div>
                      <div className="text-xs text-gray-400 mt-0.5">2小时前</div>
                    </div>
                    <div className="w-full h-px bg-gray-50 dark:bg-zinc-800"></div>
                    <div className="group cursor-pointer" onClick={() => handleSend("草莓开花期光照建议")}>
                      <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">草莓开花期光照建议</div>
                      <div className="text-xs text-gray-400 mt-0.5">昨天</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all h-48 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm font-medium">
                    <Library size={14} />
                    <span>知识库</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">病害识别指南</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        上传叶片照片，AI 可识别红蜘蛛、白粉病等常见病害并提供防治方案。
                      </p>
                    </div>
                    <button className="self-start text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      查看指南
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all h-48 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm font-medium">
                    <Sparkles size={14} />
                    <span>系统状态</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">所有服务运行正常</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>API 延迟</span>
                        <span className="font-mono">45ms</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full w-[98%] bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          ) : (
            <>
              <Conversation className="flex-1 h-full">
                <ConversationContent id="ai-chat-area" ref={scrollAreaRef} className="p-0 max-w-5xl mx-auto w-full">
                  <div className="flex flex-col pb-40 pt-4 space-y-6">
                    {messages.map((msg, i) => (
                      <div key={i} className={cn(
                        "group w-full flex gap-4 px-4 md:px-0 transition-all duration-300",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}>
                        {msg.role === "assistant" && (
                          <div className="size-10 flex items-center justify-center shrink-0 mt-1 rounded-full overflow-hidden bg-white dark:bg-zinc-800 border border-gray-100 dark:border-gray-700">
                            <Image src="/logo.gif" alt="AI" width={40} height={40} className="object-cover" unoptimized />
                          </div>
                        )}

                        <div className={cn(
                          "relative max-w-[85%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed",
                          msg.role === "user"
                            ? "bg-[#f4f4f4] dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-tr-sm"
                            : "bg-transparent text-gray-900 dark:text-gray-100 px-0 py-0"
                        )}>
                          <div id={`message-content-${i}`} className="prose prose-neutral dark:prose-invert max-w-none break-words">
                            {renderMessageContent(msg)}
                          </div>

                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-2 mt-2 no-print">
                              <button onClick={() => copyText(typeof msg.content === 'string' ? msg.content : "")} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1" title="复制内容"><Copy size={14} /></button>
                              <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1" title="重新生成"><RotateCcw size={14} /></button>
                              <button onClick={() => handleDownloadPDF(i)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1" title="导出为 PDF"><Download size={14} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-4 px-4 md:px-0 max-w-5xl mx-auto w-full">
                        <div className="size-10 flex items-center justify-center shrink-0 mt-1 rounded-full overflow-hidden bg-white dark:bg-zinc-800 border border-gray-100 dark:border-gray-700">
                          <Image src="/logo.gif" alt="AI" width={40} height={40} className="object-cover" unoptimized />
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="size-2 bg-gray-400 rounded-full animate-bounce"></span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ConversationContent>
              </Conversation>

              {/* Floating Input Bar for Chat State */}
              <div id="ai-input-area" className="absolute bottom-0 left-0 w-full bg-transparent pt-4 pb-6 px-4">
                <div className="max-w-5xl mx-auto w-full relative">
                  <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[26px] px-4 py-3 flex flex-col gap-1 focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:ring-2 focus-within:ring-[#6366f1]/20 focus-within:border-[#6366f1]/30 transition-all duration-300 border border-gray-200/60 dark:border-gray-800/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.15)] hover:border-gray-300/80 dark:hover:border-gray-700/80">
                    {/* Attachment Preview */}
                    {attachments.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto py-2 mb-1 scrollbar-none">
                        {attachments.map((url, i) => (
                          <div key={i} className="relative group shrink-0">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                              <Image src={url} alt="preview" fill className="object-cover" />
                            </div>
                            <button
                              onClick={() => removeAttachment(i)}
                              className="absolute -top-1.5 -right-1.5 bg-gray-900/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input Area */}
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      onPaste={handlePaste}
                      placeholder="发消息给 AI 助手..."
                      className="w-full bg-transparent border-0 focus:ring-0 resize-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400/80 text-[15px] leading-relaxed py-2 px-1 min-h-[40px] max-h-[200px] font-medium"
                      rows={1}
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                      }}
                    />

                    {/* Bottom Tools Row */}
                    <div id="ai-input-tools" className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100/60 dark:border-gray-800/60">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-gray-400 hover:text-[#6366f1] group relative"
                          title="上传文件"
                        >
                          <Paperclip size={18} strokeWidth={2} />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">上传文件</span>
                        </button>

                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        <button
                          onClick={() => setEnableSearch(!enableSearch)}
                          className={cn(
                            "px-3 py-1.5 rounded-full transition-all flex items-center gap-2 text-xs font-medium border select-none",
                            enableSearch
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm"
                              : "bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:text-gray-700 dark:hover:text-gray-200"
                          )}
                          title="联网搜索"
                        >
                          <Globe size={14} strokeWidth={2.5} />
                          <span>联网搜索</span>
                        </button>

                        <button
                          onClick={() => setEnableReasoning(!enableReasoning)}
                        className={cn(
                          "px-3 py-1.5 rounded-full transition-all flex items-center gap-2 text-xs font-medium border select-none",
                          enableReasoning
                            ? "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 shadow-sm"
                            : "bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:text-gray-700 dark:hover:text-gray-200"
                        )}
                        title="Deep thinking"
                      >
                        <Sparkles size={14} strokeWidth={2.5} />
                        <span>Reasoning</span>
                      </button>

                      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                      <button
                        onClick={handleOptimizePrompt}
                        disabled={!input.trim() || isOptimizing}
                        className={cn(
                          "px-3 py-1.5 rounded-full transition-all flex items-center gap-2 text-xs font-medium border select-none",
                          isOptimizing
                            ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm cursor-wait"
                            : input.trim() 
                              ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              : "bg-white dark:bg-zinc-800 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed"
                        )}
                        title="Optimize prompt"
                      >
                        {isOptimizing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} strokeWidth={2.5} />}
                        <span>Optimize</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pl-2">
                        <button
                          onClick={handleSend}
                          disabled={!input.trim() && attachments.length === 0}
                          className={cn(
                            "size-8 rounded-lg flex items-center justify-center transition-all duration-200",
                            (input.trim() || attachments.length > 0)
                              ? "bg-[#6366f1] text-white hover:bg-[#4f46e5] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
                              : "bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          )}
                        >
                          <ArrowUp size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Hidden file input for Chat State */}
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.md" multiple className="hidden" onChange={onSelectFiles} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Help Button */}
        <div className="absolute bottom-4 right-4 z-20">
          <button className="size-8 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm">
            <CircleHelp size={16} />
          </button>
        </div>
      </div>

      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSettingsSave}
      />
    </div>
  )
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}
