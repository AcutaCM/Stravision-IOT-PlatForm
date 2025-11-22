"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import dynamic from "next/dynamic"
import { VegaEmbed } from "react-vega"
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false })
import { PageNavigation } from "@/components/page-navigation"
import Link from "next/link"
import { CloudSun, Settings as SettingsIcon, Activity, Sun, Droplets, Wind, Bug, Leaf, ArrowUpIcon, Edit, Save, User, Copy, RotateCcw, PaperclipIcon, MicIcon, Globe, Wifi, WifiOff, Plus, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { 
  AssistantModal, 
  AssistantModalHeader, 
  AssistantModalContent, 
  AssistantModalFooter,
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
  Branch,
  BranchSelector,
  BranchPrevious,
  BranchNext,
  BranchPage,
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationSource,
  InlineCitationQuote
} from "@/components/ui/assistant-ui"
import { Loader } from "@/components/ui/assistant-ui"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ui/assistant-ui"
import { Response } from "@/components/ui/assistant-ui"
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ui/assistant-ui"
import { Suggestions, Suggestion } from "@/components/ui/assistant-ui"
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/components/ui/assistant-ui"
import { AISettingsDialog } from "@/components/ai-settings-dialog"
import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import GridLayout, { Layout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

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

export default function DashboardPage() {
  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()
  
  // Use shared weather data from context
  const { weatherData } = useWeatherContext()
  
  const defaultLayout = [
    { i: "humidity", x: 0, y: 0, w: 3, h: 2 },
    { i: "temperature", x: 3, y: 0, w: 3, h: 2 },
    { i: "light", x: 6, y: 0, w: 3, h: 2 },
    { i: "co2", x: 9, y: 0, w: 3, h: 2 },
    { i: "soilMoisture", x: 0, y: 2, w: 3, h: 2 },
    { i: "fertility", x: 3, y: 2, w: 3, h: 2 },
    { i: "nitrogen", x: 6, y: 2, w: 3, h: 2 },
    { i: "phosphorus", x: 9, y: 2, w: 3, h: 2 },
    { i: "potassium", x: 0, y: 4, w: 3, h: 2 },
    { i: "pest", x: 3, y: 4, w: 3, h: 2 },
    { i: "maturity", x: 6, y: 4, w: 3, h: 2 },
    { i: "rainfall", x: 9, y: 4, w: 3, h: 2 },
    { i: "aiChat", x: 0, y: 6, w: 6, h: 4 },
  ]

  const [layout, setLayout] = useState(defaultLayout)
  const [isEditMode, setIsEditMode] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "你好！我是莓界AI助手，有什么可以帮助你的吗？" },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiSettings, setAISettings] = useState<AISettings | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [branchIndex, setBranchIndex] = useState(0)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [enableSearch, setEnableSearch] = useState<boolean>(true)
  const [autoScroll, setAutoScroll] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sessions, setSessions] = useState<SessionMeta[]>([])

  const getLastUserIndex = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i
    }
    return -1
  }
  const branchIndices = (() => {
    const lastUser = getLastUserIndex()
    if (lastUser === -1) return [] as number[]
    const arr: number[] = []
    for (let i = lastUser + 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant') arr.push(i)
      else break
    }
    return arr
  })()

  useEffect(() => {
    if (branchIndices.length > 0) {
      setBranchIndex(branchIndices.length - 1)
    } else {
      setBranchIndex(0)
    }
  }, [messages])

  const CitationContent = ({ sources }: { sources: Citation[] }) => {
    const [idx, setIdx] = useState(0)
    const s = sources[Math.max(0, Math.min(idx, Math.max(0, sources.length - 1)))]
    return (
      <InlineCitationCarousel>
        <InlineCitationCarouselHeader>
          <InlineCitationCarouselIndex>{`${Math.min(idx + 1, Math.max(1, sources.length))} / ${Math.max(1, sources.length)}`}</InlineCitationCarouselIndex>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={idx <= 0} onClick={() => setIdx(Math.max(0, idx - 1))}><span aria-hidden>◀</span></Button>
            <Button variant="ghost" size="icon-sm" disabled={idx >= sources.length - 1} onClick={() => setIdx(Math.min(sources.length - 1, idx + 1))}><span aria-hidden>▶</span></Button>
          </div>
        </InlineCitationCarouselHeader>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem>
            <InlineCitationSource title={s?.title || s?.url} url={s?.url || "#"} description={s?.description} />
            {s?.quote ? <InlineCitationQuote>{s.quote}</InlineCitationQuote> : null}
          </InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    )
  }

  

  const renderMarkdownWithCitations = (text: string, citations?: Citation[], keyParam?: string) => {
    // 清理 HTML 标签（如 </ref>）
    const cleanText = text.replace(/<\/?ref>/g, '')
    
    const nodes: React.ReactNode[] = []
    const r = /\[(\d+)\]/g
    let li = 0
    let m: RegExpExecArray | null
    let idx = 0
    while ((m = r.exec(cleanText)) !== null) {
      if (m.index > li) {
        const seg = cleanText.slice(li, m.index)
        nodes.push(
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            key={`md-${keyParam}-${idx++}`}
            components={{
              img: ({node, ...props}) => (
                <img 
                  {...props} 
                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage(typeof props.src === 'string' ? props.src : '')}
                  alt={props.alt || ''}
                />
              )
            }}
          >
            {seg}
          </ReactMarkdown>
        )
      }
      const num = m[1]
      const sources = (citations || []).filter(c => String(c.number) === String(num))
      if (sources.length > 0) {
        nodes.push(
          <InlineCitation key={`c-${num}-${li}`}>
            <InlineCitationCard>
              <InlineCitationCardTrigger sources={sources.map(s => s.url)} number={num}>
                <InlineCitationCardBody>
                  <CitationContent sources={sources} />
                </InlineCitationCardBody>
              </InlineCitationCardTrigger>
            </InlineCitationCard>
          </InlineCitation>
        )
      } else {
        nodes.push(<span key={`b-${idx++}`}>{m[0]}</span>)
      }
      li = r.lastIndex
    }
    if (li < cleanText.length) {
      const seg = cleanText.slice(li)
      nodes.push(
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          key={`md-end-${keyParam}`}
          components={{
            img: ({node, ...props}) => (
              <img 
                {...props} 
                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewImage(typeof props.src === 'string' ? props.src : '')}
                alt={props.alt || ''}
              />
            )
          }}
        >
          {seg}
        </ReactMarkdown>
      )
    }
    return <div key={keyParam} className="leading-relaxed">{nodes}</div>
  }

  const renderMessageContent = (msg: Message) => {
    const content = msg.content
    const parts: { type: "text" | "code" | "chart"; language?: string; value: string; chartType?: string }[] = []
    const blockRegex = /<CHART\s+type="([^"]+)"\s*>([\s\S]*?)<\/CHART>|```(\w+)?\n([\s\S]*?)```/g
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
          
          // 检测设备控制命令
          const isDeviceCommand = maybe && typeof maybe === "object" && maybe.action && (maybe.action === "toggle_relay" || maybe.action === "set_led")
          if (isDeviceCommand) {
            return (
              <div key={`device-cmd-${i}`} className="mt-2 w-full rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 p-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-blue-300">🎮 设备控制命令</div>
                  <pre className="text-xs text-white/80 bg-black/30 p-3 rounded overflow-x-auto"><code>{JSON.stringify(maybe, null, 2)}</code></pre>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/ai/device-control', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(maybe)
                        })
                        const result = await response.json()
                        if (result.success) {
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: '✅ 命令执行成功！设备状态已更新。'
                          }])
                        } else {
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `❌ 命令执行失败：${result.error || '未知错误'}`
                          }])
                        }
                      } catch (error) {
                        setMessages(prev => [...prev, {
                          role: 'assistant',
                          content: `❌ 命令执行失败：${error instanceof Error ? error.message : '网络错误'}`
                        }])
                      }
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    执行命令
                  </Button>
                </div>
              </div>
            )
          }
          
          const looksEcharts = maybe && typeof maybe === "object" && (maybe.series || maybe.xAxis || maybe.yAxis)
          if (looksEcharts) {
            return (
              <div key={`echarts-code-${i}`} className="mt-2 w-full overflow-x-auto rounded-lg bg-black/30 p-2 border border-white/10">
                <ReactECharts option={maybe} style={{ width: "100%", height: 320 }} />
              </div>
            )
          }
        } catch {}
        return (
          <pre key={`code-${i}`} className="mt-2 w-full overflow-x-auto rounded-lg bg-black/50 text-white p-3 border border-white/10"><code className="font-mono text-xs">{p.value}</code></pre>
        )
      }
      if (p.type === "chart" && String(p.chartType).toLowerCase() === "vega-lite") {
        let spec: unknown = null
        try { spec = JSON.parse(p.value) } catch {}
        if (spec && typeof spec === "object") {
          const defaultConfig = {
            background: "transparent",
            axis: {
              labelColor: "rgba(255,255,255,0.85)",
              titleColor: "rgba(255,255,255,0.9)",
              gridColor: "rgba(255,255,255,0.08)",
              tickColor: "rgba(255,255,255,0.25)",
              labelFont: "Inter, system-ui, sans-serif",
              titleFont: "Inter, system-ui, sans-serif",
            },
            legend: {
              labelColor: "rgba(255,255,255,0.85)",
              titleColor: "rgba(255,255,255,0.9)",
              labelFont: "Inter, system-ui, sans-serif",
              titleFont: "Inter, system-ui, sans-serif",
            },
            title: {
              color: "rgba(255,255,255,0.95)",
              font: "Inter, system-ui, sans-serif",
            },
            view: { stroke: "rgba(255,255,255,0.12)" },
          }
          const base = spec as Record<string, unknown>
          const width = typeof base["width"] === "number" ? (base["width"] as number) : 560
          const height = typeof base["height"] === "number" ? (base["height"] as number) : 320
          const cfg = typeof base["config"] === "object" && base["config"] !== null ? (base["config"] as Record<string, unknown>) : {}
          const safeSpec = { ...base, width, height, config: { ...defaultConfig, ...cfg } }
          return (
            <div key={`chart-${i}`} className="mt-2 w-full overflow-x-auto rounded-lg bg-black/30 p-2 border border-white/10">
              <VegaEmbed spec={safeSpec} />
            </div>
          )
        }
      }
      if (p.type === "chart" && String(p.chartType).toLowerCase() === "echarts") {
        let option: unknown = null
        try { option = JSON.parse(p.value) } catch {}
        if (option && typeof option === "object") {
          return (
            <div key={`chart-e-${i}`} className="mt-2 w-full overflow-x-auto rounded-lg bg-black/30 p-2 border border-white/10">
              <ReactECharts option={option as Record<string, unknown>} style={{ width: "100%", height: 320 }} />
            </div>
          )
        }
      }
      return (
        <Response key={`text-${i}`}>{renderMarkdownWithCitations(p.value, msg.citations, `text-${i}`)}</Response>
      )
    })
  }

  const sendByContent = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return
    if (!aiSettings?.apiKey) {
      setMessages(prev => [...prev, { role: "assistant", content: "请先配置 AI API 密钥。点击右上角的设置按钮进行配置。" }])
      return
    }
    setIsLoading(true)
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          apiKey: aiSettings.apiKey,
          apiUrl: aiSettings.apiUrl,
          model: selectedModel || aiSettings.model,
          systemPrompt: aiSettings.systemPrompt,
          enableSearch,
          deviceData,
          weatherData,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "API request failed")
      }
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""
      let reasoningText = ""
      let reasoningStart = -1
      const startTs = Date.now()
      setMessages(prev => [...prev, { role: "assistant", content: "" }])
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  assistantMessage += content
                  const combined = assistantMessage
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
                        const arr = JSON.parse(json) as unknown
                        if (Array.isArray(arr)) {
                          tasksUpdate = arr.map((t: any) => {
                            const items = Array.isArray(t.items) ? t.items.map((it: any) => ({ type: it.type, text: it.text, file: it.file })) : []
                            return { title: String(t.title ?? "任务"), items, status: String(t.status ?? "pending") as TaskModel["status"] }
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
                    const last = newMsgs[newMsgs.length - 1]
                    newMsgs[newMsgs.length - 1] = { role: "assistant", content: display, reasoning: { text: reasoningText, durationMs: Date.now() - startTs }, tasks: tasksUpdate ?? last.tasks }
                    return newMsgs
                  })
                }
              } catch (e) {}
            }
          }
        }
      }
      try {
        const m = assistantMessage.match(/<SOURCES>\s*([\s\S]*?)\s*<\/SOURCES>/)
        let citations: Citation[] = []
        let clean = assistantMessage
        if (m && m[1]) {
          try {
            const arr = JSON.parse(m[1]) as unknown
            if (Array.isArray(arr)) {
              const toCitation = (v: unknown): Citation | null => {
                if (typeof v !== "object" || v === null) return null
                const o = v as Record<string, unknown>
                const getStr = (k: string) => {
                  const val = o[k]
                  return typeof val === "string" && val.trim() !== "" ? val.trim() : undefined
                }
                const pickUrlFromText = (s?: string) => {
                  if (!s) return undefined
                  const m = s.match(/https?:\/\/[^\s)]+/i)
                  if (m) return m[0]
                  const m2 = s.match(/\b([a-z0-9.-]+\.[a-z]{2,})(\/[^\s)]*)?/i)
                  return m2 ? `https://${m2[0]}` : undefined
                }
                const num = String((o.number as string | number | undefined) ?? "1")
                const tRaw = getStr("title") ?? getStr("url") ?? ""
                let uRaw = getStr("url")
                if (!uRaw) {
                  uRaw = getStr("href") ?? getStr("link") ?? getStr("source") ?? getStr("website") ?? getStr("page") ?? getStr("page_url") ?? getStr("origin") ?? getStr("source_url") ?? getStr("openUrl")
                }
                if (!uRaw) {
                  uRaw = pickUrlFromText(tRaw) ?? pickUrlFromText(getStr("description")) ?? pickUrlFromText(getStr("quote"))
                }
                if (!uRaw) return null
                let u = uRaw
                if (!/^https?:\/\//i.test(u)) u = `https://${u}`
                try { new URL(u) } catch { return null }
                const desc = getStr("description")
                const q = getStr("quote")
                return { number: num, title: String(tRaw || u), url: String(u), description: desc, quote: q }
              }
              citations = (arr.map((v) => toCitation(v)).filter((x): x is Citation => !!x))
            }
          } catch {}
          clean = clean.replace(m[0], "").trim()
        }
        let tasks: TaskModel[] | undefined
        const mt = assistantMessage.match(/<TASKS>\s*([\s\S]*?)\s*<\/TASKS>/)
        if (mt && mt[1]) {
          try {
            const parsed = JSON.parse(mt[1]) as unknown
            if (Array.isArray(parsed)) {
              tasks = parsed.map((t) => {
                const o = t as any
                const items = Array.isArray(o.items) ? o.items.map((it: any) => ({ type: it.type, text: it.text, file: it.file })) : []
                return { title: String(o.title ?? "任务"), items, status: String(o.status ?? "pending") as TaskModel["status"] }
              })
            }
          } catch {}
          clean = clean.replace(mt[0], "").trim()
        }
        clean = clean.replace(/<REASONING>\s*([\s\S]*?)\s*<\/REASONING>/, "").trim()
        setMessages(prev => {
          const newMsgs = [...prev]
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: clean, citations, reasoning: { text: reasoningText, durationMs: Date.now() - startTs }, tasks }
          return newMsgs
        })
        try {
          const needRefine = (citations.length === 0) || citations.some(c => !(/^https?:\/\//i.test(c.url)))
          if (needRefine && aiSettings?.apiKey) {
          const r = await fetch('/api/citations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...messages, { role: 'assistant', content: clean }].map(m => ({ role: m.role, content: m.content })),
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
                setMessages(prev => {
                  const nm = [...prev]
                  const last = nm[nm.length - 1]
                  nm[nm.length - 1] = { ...last, citations: refined }
                  return nm
                })
              }
            }
          }
        } catch {}
      } catch {}
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error("Chat error:", error)
      setMessages(prev => [...prev, { role: "assistant", content: `错误: ${msg || "发送消息失败，请检查API配置。"}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  const retryAssistantAtIndex = async (index: number) => {
    let prevUser = ""
    for (let j = index - 1; j >= 0; j--) {
      if (messages[j].role === "user") { prevUser = messages[j].content; break }
    }
    if (prevUser) { await sendByContent(prevUser) }
  }

  const starterPrompts = [
    "今天你能帮我做什么？",
    "解释一下智慧农业如何监测环境",
    "帮我写一段设备控制的告警规则",
    "把当前数据看板的指标做个总结",
  ]

  const handleSuggestionClick = async (s: string) => {
    await sendByContent(s)
  }

  // 从 localStorage 加载布局和AI设置
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout')
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout))
      } catch (e) {
        console.error('Failed to load layout:', e)
      }
    }

    // 从服务器加载AI设置
    const loadAISettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const serverSettings = await response.json()
          const savedSettingsStr = localStorage.getItem('ai-settings')
          const localSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : null

          const shouldUseLocal = !serverSettings?.apiKey || String(serverSettings.apiKey).trim() === ''
          const effective = shouldUseLocal && localSettings ? localSettings : serverSettings

          setAISettings(effective)
          if (!selectedModel && effective?.model) setSelectedModel(effective.model)
        } else {
          const savedSettingsStr = localStorage.getItem('ai-settings')
          if (savedSettingsStr) {
            const parsed = JSON.parse(savedSettingsStr)
            setAISettings(parsed)
            if (!selectedModel && parsed?.model) setSelectedModel(parsed.model)
          }
        }
      } catch (e) {
        console.error('Failed to load AI settings:', e)
        const savedSettingsStr = localStorage.getItem('ai-settings')
        if (savedSettingsStr) {
          try {
            const parsed = JSON.parse(savedSettingsStr)
            setAISettings(parsed)
            if (!selectedModel && parsed?.model) setSelectedModel(parsed.model)
          } catch (parseError) {
            console.error('Failed to parse localStorage settings:', parseError)
          }
        }
      }
    }
    loadAISettings()
  }, [])

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const r = await fetch('/api/sessions')
        if (r.ok) {
          const data = await r.json()
          const arr = Array.isArray(data?.sessions) ? (data.sessions as SessionMeta[]) : []
          setSessions(arr)
        }
      } catch {}
    }
    loadSessions()
  }, [])

  useEffect(() => {
    try {
      const v = localStorage.getItem('ai-enable-search')
      if (v === 'true') setEnableSearch(true)
      else if (v === 'false') setEnableSearch(false)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard-messages')
      if (saved) {
        const parsed = JSON.parse(saved) as unknown
        if (Array.isArray(parsed)) {
          const normalized: Message[] = parsed.map((m) => {
            const o = m as Record<string, unknown>
            const role = String(o.role ?? 'assistant')
            const content = String(o.content ?? '')
            const citations = Array.isArray(o.citations) ? (o.citations as Citation[]) : undefined
            const reasoning = o.reasoning && typeof o.reasoning === 'object' ? (o.reasoning as { text: string; durationMs?: number }) : undefined
            const tasks = Array.isArray(o.tasks) ? (o.tasks as TaskModel[]) : undefined
            return { role: role === 'user' ? 'user' : 'assistant', content, citations, reasoning, tasks }
          })
          if (normalized.length > 0) setMessages(normalized)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('dashboard-messages', JSON.stringify(messages))
    } catch {}
  }, [messages])

  useEffect(() => {
    const init = async () => {
      try {
        const existing = localStorage.getItem('dashboard-session-id')
        let sid = existing
        if (!sid) {
          const title = `默认会话 ${new Date().toLocaleString('zh-CN')}`
          const r = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
          if (r.ok) { const s = await r.json(); sid = s?.id }
          if (!sid) sid = `${Date.now()}`
          localStorage.setItem('dashboard-session-id', sid)
        }
        setSessionId(sid)
        const resp = await fetch(`/api/sessions/${sid}`)
        if (resp.ok) {
          const data = await resp.json()
          const arr = Array.isArray(data?.messages) ? data.messages as Message[] : []
          if (arr.length > 0) setMessages(arr)
        }
      } catch {}
    }
    init()
  }, [])

  useEffect(() => {
    if (!sessionId) return
    if (savingTimer.current) clearTimeout(savingTimer.current)
    savingTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/sessions/${sessionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
      } catch {}
    }, 400)
    return () => { if (savingTimer.current) clearTimeout(savingTimer.current) }
  }, [messages, sessionId])
  
  // 只有当 autoScroll 为 true 时才滚动到底部
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      // 滚动后重置状态
      setAutoScroll(false)
    }
  }, [autoScroll])  // 移除 messages 依赖，避免每次消息更新都触发

  

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // 检查是否配置了API
    if (!aiSettings?.apiKey) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "请先配置 AI API 密钥。点击右上角的设置按钮进行配置。"
      }])
      return
    }

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    let reasoningText = ""
    let reasoningStart = -1
    const startTs = Date.now()

    // 添加用户消息
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)

    try {
      // 调用API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          apiKey: aiSettings.apiKey,
          apiUrl: aiSettings.apiUrl,
          model: selectedModel || aiSettings.model,
          systemPrompt: aiSettings.systemPrompt,
          enableSearch,
          deviceData,
          weatherData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "API request failed")
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""

      // 添加空的助手消息
      setMessages(prev => [...prev, { role: "assistant", content: "" }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  assistantMessage += content
                  const combined = assistantMessage
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
                        const arr = JSON.parse(json) as unknown
                        if (Array.isArray(arr)) {
                          tasksUpdate = arr.map((t: any) => {
                            const items = Array.isArray(t.items) ? t.items.map((it: any) => ({ type: it.type, text: it.text, file: it.file })) : []
                            return { title: String(t.title ?? "任务"), items, status: String(t.status ?? "pending") as TaskModel["status"] }
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
                    const last = newMsgs[newMsgs.length - 1]
                    newMsgs[newMsgs.length - 1] = { role: "assistant", content: display, reasoning: { text: reasoningText, durationMs: Date.now() - startTs }, tasks: tasksUpdate ?? last.tasks }
                    return newMsgs
                  })
                }
              } catch (e) {}
            }
          }
        }
      }
      try {
        const m = assistantMessage.match(/<SOURCES>\s*([\s\S]*?)\s*<\/SOURCES>/)
        let citations: Citation[] = []
        let clean = assistantMessage
        if (m && m[1]) {
          try {
            const arr = JSON.parse(m[1]) as unknown
            if (Array.isArray(arr)) {
              const toCitation = (v: unknown): Citation | null => {
                if (typeof v !== "object" || v === null) return null
                const o = v as Record<string, unknown>
                const getStr = (k: string) => {
                  const val = o[k]
                  return typeof val === "string" && val.trim() !== "" ? val.trim() : undefined
                }
                const pickUrlFromText = (s?: string) => {
                  if (!s) return undefined
                  const m = s.match(/https?:\/\/[^\s)]+/i)
                  if (m) return m[0]
                  const m2 = s.match(/\b([a-z0-9.-]+\.[a-z]{2,})(\/[^\s)]*)?/i)
                  return m2 ? `https://${m2[0]}` : undefined
                }
                const num = String((o.number as string | number | undefined) ?? "1")
                const tRaw = getStr("title") ?? getStr("url") ?? ""
                let uRaw = getStr("url")
                if (!uRaw) {
                  uRaw = getStr("href") ?? getStr("link") ?? getStr("source") ?? getStr("website") ?? getStr("page") ?? getStr("page_url") ?? getStr("origin") ?? getStr("source_url") ?? getStr("openUrl")
                }
                if (!uRaw) {
                  uRaw = pickUrlFromText(tRaw) ?? pickUrlFromText(getStr("description")) ?? pickUrlFromText(getStr("quote"))
                }
                if (!uRaw) return null
                let u = uRaw
                if (!/^https?:\/\//i.test(u)) u = `https://${u}`
                try { new URL(u) } catch { return null }
                const desc = getStr("description")
                const q = getStr("quote")
                return { number: num, title: String(tRaw || u), url: String(u), description: desc, quote: q }
              }
              citations = (arr.map((v) => toCitation(v)).filter((x): x is Citation => !!x))
            }
          } catch {}
          clean = clean.replace(m[0], "").trim()
        }
        let tasks: TaskModel[] | undefined
        const mt = assistantMessage.match(/<TASKS>\s*([\s\S]*?)\s*<\/TASKS>/)
        if (mt && mt[1]) {
          try {
            const parsed = JSON.parse(mt[1]) as unknown
            if (Array.isArray(parsed)) {
              tasks = parsed.map((t) => {
                const o = t as any
                const items = Array.isArray(o.items) ? o.items.map((it: any) => ({ type: it.type, text: it.text, file: it.file })) : []
                return { title: String(o.title ?? "任务"), items, status: String(o.status ?? "pending") as TaskModel["status"] }
              })
            }
          } catch {}
          clean = clean.replace(mt[0], "").trim()
        }
        clean = clean.replace(/<REASONING>\s*([\s\S]*?)\s*<\/REASONING>/, "").trim()
        setMessages(prev => {
          const newMsgs = [...prev]
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: clean, citations, reasoning: { text: reasoningText, durationMs: Date.now() - startTs }, tasks }
          return newMsgs
        })
      } catch {}
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error("Chat error:", error)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `错误: ${msg || "发送消息失败，请检查API配置。"}`
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingsSave = (settings: AISettings) => {
    setAISettings(settings)
    if (settings?.model) setSelectedModel(settings.model)
  }

  const onLayoutChange = (newLayout: Layout[]) => {
    if (isEditMode) {
      setLayout(newLayout)
    }
  }

  const handleSaveLayout = () => {
    localStorage.setItem('dashboard-layout', JSON.stringify(layout))
    setIsEditMode(false)
    // 可以添加一个提示
    alert('布局已保存！')
  }

  const handleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  return (
    <>
      <style jsx global>{`
        @keyframes rain-dashboard {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(300%); opacity: 0; }
        }
        @keyframes fade-in-dashboard {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes grow-bar {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
        .animate-rain-dashboard { animation: rain-dashboard 1.2s linear infinite; }
        .animate-fade-in-dashboard { animation: fade-in-dashboard 0.6s ease-out; }
        .animate-grow-bar { animation: grow-bar 0.8s ease-out; }
      `}</style>
      <div className="min-h-screen w-screen h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0E1524] to-[#0a0e1a] text-white">
      <div className="grid grid-rows-[72px_1fr] h-full w-full">
        {/* Header */}
        <div className="relative flex items-center px-8 border-b border-white/5 bg-[#0a0e1a]/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 text-white">
            <Image src="/logo.svg" alt="logo" width={64} height={64} />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wide">STRAVISION</div>
              <div className="text-xs text-white/60">莓界 · 智慧农业平台</div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <PageNavigation />
          </div>
          
          {/* 布局编辑按钮和连接状态 */}
          <div className="ml-auto flex items-center gap-3">
            {connectionStatus.connected ? (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
                <Wifi className="size-3 mr-1" />
                已连接
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
                <WifiOff className="size-3 mr-1" />
                {connectionStatus.error || '未连接'}
              </Badge>
            )}
            {connectionStatus.lastUpdate && (
              <span className="text-xs text-white/40">
                更新: {connectionStatus.lastUpdate.toLocaleTimeString()}
              </span>
            )}
            {isEditMode ? (
              <Button 
                onClick={handleSaveLayout}
                className="h-9 rounded-full px-5 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Save className="mr-2" size={18}/> 保存布局
              </Button>
            ) : (
              <Button 
                onClick={handleEditMode}
                variant="ghost"
                className="h-9 rounded-full px-5 text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <Edit className="mr-2" size={18}/> 编辑布局
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="relative px-8 pb-8 pt-6">
          <div className="w-full">
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={80}
              width={typeof window !== 'undefined' ? window.innerWidth - 64 : 1600}
              onLayoutChange={onLayoutChange}
              isDraggable={isEditMode}
              isResizable={isEditMode}
              compactType={null}
              preventCollision={true}
            >
            {/* 湿度 */}
            <div key="humidity">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">
                        {deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'}
                        <span className="text-2xl font-normal text-white/70">%</span>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">湿度</Badge>
                    </div>
                    <Droplets className="size-10 text-blue-400" />
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                    <defs>
                      <linearGradient id="humidity" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M0,40 Q75,30 150,35 T300,30" fill="none" stroke="#60a5fa" strokeWidth="2.5" />
                    <path d="M0,40 Q75,30 150,35 T300,30 L300,60 L0,60 Z" fill="url(#humidity)" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 温度 */}
            <div key="temperature">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">
                        {deviceData ? (deviceData.temperature / 10).toFixed(1) : '--'}
                        <span className="text-2xl font-normal text-white/70">°C</span>
                      </div>
                      <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">温度</Badge>
                    </div>
                    <Sun className="size-10 text-orange-400" />
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                    <defs>
                      <linearGradient id="temp" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#fb923c" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M0,45 Q75,35 150,40 T300,35" fill="none" stroke="#fb923c" strokeWidth="2.5" />
                    <path d="M0,45 Q75,35 150,40 T300,35 L300,60 L0,60 Z" fill="url(#temp)" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 光照 */}
            <div key="light">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">
                        {deviceData ? deviceData.light : '--'}
                        <span className="text-2xl font-normal text-white/70">lux</span>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">光照强度</Badge>
                    </div>
                    <Sun className="size-10 text-yellow-400" strokeWidth={1.5} />
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                    <defs>
                      <linearGradient id="light" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#facc15" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#facc15" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M0,50 Q75,25 150,30 T300,20" fill="none" stroke="#facc15" strokeWidth="2.5" />
                    <path d="M0,50 Q75,25 150,30 T300,20 L300,60 L0,60 Z" fill="url(#light)" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* CO2 */}
            <div key="co2">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">
                        {deviceData ? deviceData.co2 : '--'}
                        <span className="text-2xl font-normal text-white/70">ppm</span>
                      </div>
                      <Badge className="bg-gray-500/20 text-white/70 border-gray-500/30">CO₂浓度</Badge>
                    </div>
                    <Wind className="size-10 text-gray-500" />
                  </div>
                  <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                    {[60, 75, 50, 85, 65, 70, 55, 80].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 土壤湿度 */}
            <div key="soilMoisture">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">
                        {deviceData ? deviceData.earth_water : '--'}
                        <span className="text-2xl font-normal text-white/70">%</span>
                      </div>
                      <Badge className="bg-cyan-500/20 text-cyan-600 border-cyan-500/30">土壤湿度</Badge>
                    </div>
                    <Droplets className="size-10 text-cyan-400" />
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                    <defs>
                      <linearGradient id="soilMoisture" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M0,42 Q75,38 150,40 T300,38" fill="none" stroke="#22d3ee" strokeWidth="2.5" />
                    <path d="M0,42 Q75,38 150,40 T300,38 L300,60 L0,60 Z" fill="url(#soilMoisture)" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 土壤肥力 */}
            <div key="fertility">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">78.5<span className="text-2xl font-normal text-white/70">%</span></div>
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">土壤肥力</Badge>
                    </div>
                    <Leaf className="size-10 text-green-500" />
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                    <defs>
                      <linearGradient id="fertility" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4ade80" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M0,48 Q75,32 150,38 T300,28" fill="none" stroke="#4ade80" strokeWidth="2.5" />
                    <path d="M0,48 Q75,32 150,38 T300,28 L300,60 L0,60 Z" fill="url(#fertility)" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 氮含量 */}
            <div key="nitrogen">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {deviceData ? deviceData.earth_n : '--'}
                        <span className="text-xl font-normal text-white/70">mg/kg</span>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">氮含量 (N)</Badge>
                    </div>
                    <div className="size-10 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xl">N</div>
                  </div>
                  <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                    {[55, 70, 60, 75, 65].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-lg" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 磷含量 */}
            <div key="phosphorus">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {deviceData ? deviceData.earth_p : '--'}
                        <span className="text-xl font-normal text-white/70">mg/kg</span>
                      </div>
                      <Badge className="bg-pink-500/20 text-pink-600 border-pink-500/30">磷含量 (P)</Badge>
                    </div>
                    <div className="size-10 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold text-xl">P</div>
                  </div>
                  <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                    {[50, 65, 55, 70, 60].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-pink-400 to-pink-300 rounded-t-lg" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 钾含量 */}
            <div key="potassium">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {deviceData ? deviceData.earth_k : '--'}
                        <span className="text-xl font-normal text-white/70">mg/kg</span>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">钾含量 (K)</Badge>
                    </div>
                    <div className="size-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-xl">K</div>
                  </div>
                  <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                    {[65, 75, 70, 80, 72].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-lg" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 病虫害率 */}
            <div key="pest">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">2.3<span className="text-2xl font-normal text-white/70">%</span></div>
                      <Badge className="bg-red-500/20 text-red-600 border-red-500/30">病虫害率</Badge>
                    </div>
                    <Bug className="size-10 text-red-500" />
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                    <defs>
                      <linearGradient id="pest" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M0,55 Q75,52 150,54 T300,52" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                    <path d="M0,55 Q75,52 150,54 T300,52 L300,60 L0,60 Z" fill="url(#pest)" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 成熟率 */}
            <div key="maturity">
              <Card className="h-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:shadow-3xl transition-all cursor-move">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-5xl font-bold text-white mb-2">87.6<span className="text-2xl font-normal text-white/70">%</span></div>
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">成熟率</Badge>
                    </div>
                    <Leaf className="size-10 text-emerald-500" />
                  </div>
                  <svg viewBox="0 0 300 60" className="w-full h-16 mt-4">
                    <defs>
                      <linearGradient id="maturity" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M0,50 Q75,28 150,32 T300,22" fill="none" stroke="#10b981" strokeWidth="2.5" />
                    <path d="M0,50 Q75,28 150,32 T300,22 L300,60 L0,60 Z" fill="url(#maturity)" />
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 降雨量 */}
            <div key="rainfall">
              {(() => {
                const todayPrecip = weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm || 0
                const isRaining = todayPrecip > 0
                
                return (
                  <Card className={`h-full rounded-3xl border overflow-hidden shadow-2xl bg-gradient-to-br transition-all cursor-move relative ${
                    isRaining 
                      ? 'from-blue-600/20 via-cyan-600/15 to-blue-700/20 border-blue-400/30 hover:shadow-blue-500/20' 
                      : 'from-[#1a2332] to-[#0f1419] border-white/5 hover:shadow-3xl'
                  }`}>
                    {/* 雨滴动画效果 */}
                    {isRaining && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {Array.from({ length: 15 }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-0.5 h-3 bg-blue-300/30 animate-rain-dashboard"
                            style={{
                              left: `${Math.random() * 100}%`,
                              animationDelay: `${Math.random() * 2}s`,
                              animationDuration: `${0.8 + Math.random() * 0.4}s`
                            }}
                          />
                        ))}
                      </div>
                    )}
                    
                    <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-5xl font-bold text-white mb-2 animate-fade-in-dashboard">
                            {weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm?.toFixed(1) || '--'}
                            <span className="text-2xl font-normal text-white/70">mm</span>
                          </div>
                          <Badge className={`${isRaining ? 'bg-blue-400/30 text-blue-200 border-blue-400/40' : 'bg-blue-500/20 text-blue-600 border-blue-500/30'}`}>
                            今日降雨量
                          </Badge>
                        </div>
                        <Droplets className={`size-10 transition-all ${isRaining ? 'text-blue-300 animate-bounce' : 'text-blue-400'}`} />
                      </div>
                      <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                        {weatherData?.forecast?.forecastday?.slice(0, 7).map((day, i) => {
                          const maxPrecip = Math.max(...(weatherData.forecast.forecastday.slice(0, 7).map(d => d.day.totalprecip_mm || 0)), 1)
                          const height = ((day.day.totalprecip_mm || 0) / maxPrecip) * 100
                          const hasRain = (day.day.totalprecip_mm || 0) > 0
                          return (
                            <div 
                              key={i} 
                              className={`flex-1 rounded-t-lg transition-all duration-500 ${
                                hasRain 
                                  ? 'bg-gradient-to-t from-blue-400 to-blue-300 hover:from-blue-500 hover:to-blue-400 animate-grow-bar' 
                                  : 'bg-gradient-to-t from-blue-400/20 to-blue-300/20 hover:from-blue-400/30 hover:to-blue-300/30'
                              }`}
                              style={{ 
                                height: `${Math.max(height, 5)}%`,
                                animationDelay: `${i * 0.1}s`
                              }}
                              title={`${day.date}: ${day.day.totalprecip_mm?.toFixed(1) || 0}mm`}
                            />
                          )
                        }) || [40, 60, 35, 70, 45, 55, 50].map((height, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-blue-400/30 to-blue-300/30 rounded-t-lg" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}
            </div>

            {/* AI 助手聊天 */}
            <div key="aiChat">
              <AssistantModal className="h-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/5">
                {/* Header */}
                <AssistantModalHeader className="border-white/10">
                  <div className="w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <MessageAvatar className="bg-gradient-to-br from-blue-500 to-blue-600" src="/logo.svg" name="AI" />
                        <div>
                          <div className="text-white font-semibold text-sm">莓界 AI 助手</div>
                          <div className="text-xs text-white/60">{aiSettings?.apiKey ? "已配置 API" : "未配置 API"}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSettingsOpen(true)}
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <SettingsIcon className="size-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white/60">会话</span>
                      <PromptInputModelSelect value={sessionId || ""} onValueChange={async (v) => {
                      try {
                        if (v === "__new__") {
                          const title = `新会话 ${new Date().toLocaleString('zh-CN')}`
                          const r = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                          if (r.ok) {
                            const s = await r.json()
                            const id = String(s?.id || '')
                            setSessionId(id)
                            localStorage.setItem('dashboard-session-id', id)
                            const resp = await fetch(`/api/sessions/${id}`)
                            const data = resp.ok ? await resp.json() : {}
                            const arr = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
                            setMessages(arr.length > 0 ? arr : [{ role: 'assistant', content: '你好！我是莓界AI助手，有什么可以帮助你的吗？' }])
                          }
                          const lr = await fetch('/api/sessions')
                          if (lr.ok) { const ld = await lr.json(); const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []; setSessions(ls) }
                          return
                        }
                        if (v === "__rename__") {
                          if (!sessionId) return
                          const t = window.prompt('重命名会话', (sessions.find(s => s.id === sessionId)?.title) || '')
                          if (t === null) return
                          const title = String(t)
                          await fetch(`/api/sessions/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                          const lr = await fetch('/api/sessions')
                          if (lr.ok) { const ld = await lr.json(); const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []; setSessions(ls) }
                          return
                        }
                        if (v === "__delete__") {
                          if (!sessionId) return
                          const ok = window.confirm('删除当前会话？')
                          if (!ok) return
                          await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
                          const lr = await fetch('/api/sessions')
                          let nextId = ''
                          if (lr.ok) {
                            const ld = await lr.json()
                            const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []
                            setSessions(ls)
                            nextId = ls[0]?.id || ''
                          }
                          if (!nextId) {
                            const title = `默认会话 ${new Date().toLocaleString('zh-CN')}`
                            const r = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                            if (r.ok) { const s = await r.json(); nextId = String(s?.id || '') }
                          }
                          if (nextId) {
                            setSessionId(nextId)
                            localStorage.setItem('dashboard-session-id', nextId)
                            const resp = await fetch(`/api/sessions/${nextId}`)
                            const data = resp.ok ? await resp.json() : {}
                            const arr = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
                            setMessages(arr.length > 0 ? arr : [{ role: 'assistant', content: '你好！我是莓界AI助手，有什么可以帮助你的吗？' }])
                          }
                          return
                        }
                        setSessionId(v)
                        localStorage.setItem('dashboard-session-id', v)
                        const resp = await fetch(`/api/sessions/${v}`)
                        if (resp.ok) {
                          const data = await resp.json()
                          const arr = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
                          setMessages(arr.length > 0 ? arr : [{ role: 'assistant', content: '你好！我是莓界AI助手，有什么可以帮助你的吗？' }])
                        }
                      } catch {}
                      }}>
                        <PromptInputModelSelectTrigger>
                          <span className="text-sm">{(sessions.find(s => s.id === (sessionId || ''))?.title) || '当前会话'}</span>
                        </PromptInputModelSelectTrigger>
                        <PromptInputModelSelectContent>
                          {sessions.length === 0 ? (
                            <PromptInputModelSelectItem value={sessionId || ''}>{sessionId || '当前会话'}</PromptInputModelSelectItem>
                          ) : (
                            sessions.map(s => (
                              <PromptInputModelSelectItem key={s.id} value={s.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{s.title}</span>
                                  <div className="flex items-center gap-2 opacity-70">
                                    <Button type="button" variant="ghost" size="icon-sm" className="hover:bg-white/10" onClick={async (e) => {
                                      e.preventDefault(); e.stopPropagation()
                                      const t = window.prompt('重命名会话', s.title)
                                      if (t === null) return
                                      const title = String(t)
                                      try {
                                        await fetch(`/api/sessions/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                                        const lr = await fetch('/api/sessions')
                                        if (lr.ok) { const ld = await lr.json(); const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []; setSessions(ls) }
                                      } catch {}
                                    }}><Edit className="size-4" /></Button>
                                    <Button type="button" variant="ghost" size="icon-sm" className="hover:bg-white/10" onClick={async (e) => {
                                      e.preventDefault(); e.stopPropagation()
                                      const ok = window.confirm(`删除会话「${s.title}」？`)
                                      if (!ok) return
                                      try {
                                        await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' })
                                        const lr = await fetch('/api/sessions')
                                        let nextId = ''
                                        if (lr.ok) {
                                          const ld = await lr.json()
                                          const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []
                                          setSessions(ls)
                                          nextId = (sessionId === s.id) ? (ls[0]?.id || '') : (sessionId || '')
                                        }
                                        if (!nextId) {
                                          const title = `默认会话 ${new Date().toLocaleString('zh-CN')}`
                                          const r = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                                          if (r.ok) { const res = await r.json(); nextId = String(res?.id || '') }
                                        }
                                        if (nextId) {
                                          setSessionId(nextId)
                                          localStorage.setItem('dashboard-session-id', nextId)
                                          const resp = await fetch(`/api/sessions/${nextId}`)
                                          const data = resp.ok ? await resp.json() : {}
                                          const arr = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
                                          setMessages(arr.length > 0 ? arr : [{ role: 'assistant', content: '你好！我是莓界AI助手，有什么可以帮助你的吗？' }])
                                        }
                                      } catch {}
                                    }}><Trash className="size-4" /></Button>
                                  </div>
                                </div>
                              </PromptInputModelSelectItem>
                            ))
                          )}
                          <PromptInputModelSelectItem value="__new__"><Plus className="size-4" /> 新建会话</PromptInputModelSelectItem>
                          <PromptInputModelSelectItem value="__rename__"><Edit className="size-4" /> 重命名当前会话</PromptInputModelSelectItem>
                          <PromptInputModelSelectItem value="__delete__"><Trash className="size-4" /> 删除当前会话</PromptInputModelSelectItem>
                        </PromptInputModelSelectContent>
                      </PromptInputModelSelect>
                      <Button aria-label="新建会话" variant="ghost" size="icon-sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={async () => {
                      try {
                        const title = `新会话 ${new Date().toLocaleString('zh-CN')}`
                        const r = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                        if (r.ok) {
                          const s = await r.json()
                          const id = String(s?.id || '')
                          setSessionId(id)
                          localStorage.setItem('dashboard-session-id', id)
                          const resp = await fetch(`/api/sessions/${id}`)
                          const data = resp.ok ? await resp.json() : {}
                          const arr = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
                          setMessages(arr.length > 0 ? arr : [{ role: 'assistant', content: '你好！我是莓界AI助手，有什么可以帮助你的吗？' }])
                          const lr = await fetch('/api/sessions')
                          if (lr.ok) { const ld = await lr.json(); const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []; setSessions(ls) }
                        }
                      } catch {}
                    }}><Plus className="size-4" /></Button>
                    <Button aria-label="重命名会话" variant="ghost" size="icon-sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={async () => {
                      if (!sessionId) return
                      const t = window.prompt('重命名会话', (sessions.find(s => s.id === sessionId)?.title) || '')
                      if (t === null) return
                      const title = String(t)
                      try {
                        await fetch(`/api/sessions/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                        const lr = await fetch('/api/sessions')
                        if (lr.ok) { const ld = await lr.json(); const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []; setSessions(ls) }
                      } catch {}
                    }}><Edit className="size-4" /></Button>
                    <Button aria-label="删除会话" variant="ghost" size="icon-sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={async () => {
                      if (!sessionId) return
                      const ok = window.confirm('删除当前会话？')
                      if (!ok) return
                      try {
                        await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
                        const lr = await fetch('/api/sessions')
                        let nextId = ''
                        if (lr.ok) {
                          const ld = await lr.json()
                          const ls = Array.isArray(ld?.sessions) ? (ld.sessions as SessionMeta[]) : []
                          setSessions(ls)
                          nextId = ls[0]?.id || ''
                        }
                        if (!nextId) {
                          const title = `默认会话 ${new Date().toLocaleString('zh-CN')}`
                          const r = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
                          if (r.ok) { const s = await r.json(); nextId = String(s?.id || '') }
                        }
                        if (nextId) {
                          setSessionId(nextId)
                          localStorage.setItem('dashboard-session-id', nextId)
                          const resp = await fetch(`/api/sessions/${nextId}`)
                          const data = resp.ok ? await resp.json() : {}
                          const arr = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
                          setMessages(arr.length > 0 ? arr : [{ role: 'assistant', content: '你好！我是莓界AI助手，有什么可以帮助你的吗？' }])
                        }
                      } catch {}
                    }}><Trash className="size-4" /></Button>
                    </div>
                  </div>
                </AssistantModalHeader>

                {/* Messages */}
                <AssistantModalContent className="p-0 overflow-y-hidden">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="text-xl font-semibold mb-4">今天我能帮你做什么？</div>
                      <Suggestions>
                        {starterPrompts.map((p) => (
                          <Suggestion key={p} suggestion={p} onChoose={handleSuggestionClick} />
                        ))}
                      </Suggestions>
                    </div>
                  )}
                  <Conversation className="h-full">
                    <ConversationContent ref={scrollAreaRef} className="p-4">
                      <div className="space-y-4">
                      {messages.map((msg, i) => {
                        const isBranchMember = branchIndices.includes(i)
                        const isSelectedBranch = branchIndices[branchIndex] === i
                        if (isBranchMember && !isSelectedBranch) return null
                        return (
                      <Message key={i} from={msg.role}>
                        <MessageAvatar
                          className={
                            msg.role === 'user'
                              ? "bg-gradient-to-br from-blue-500 to-blue-600"
                              : "bg-white/10"
                          }
                          src={msg.role === 'assistant' ? "/logo.svg" : undefined}
                          name={msg.role === 'assistant' ? "AI" : undefined}
                          from={msg.role}
                        />
                        <MessageContent>
                          <AssistantBubble 
                            isUser={msg.role === 'user'}
                            className={
                              msg.role === 'user'
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                : "bg-white/10 text-white"
                            }
                          >
                            {renderMessageContent(msg)}
                          </AssistantBubble>
                          {msg.role === 'assistant' && msg.reasoning?.text ? (
                            <Reasoning open={i === messages.length - 1 && isLoading} finalized={!isLoading} durationMs={msg.reasoning?.durationMs}>
                              <ReasoningTrigger className="mt-2" />
                              <ReasoningContent className="mt-1">{msg.reasoning?.text}</ReasoningContent>
                            </Reasoning>
                          ) : null}
                          {msg.role === 'assistant' && (msg.citations?.length || 0) > 0 ? (
                            <Sources>
                              <SourcesTrigger count={msg.citations?.length || 0} className="mt-2" />
                              <SourcesContent className="mt-1">
                                {msg.citations?.map((c, idx) => (
                                  <Source
                                    key={idx}
                                    href={c.url}
                                    title={c.title || c.url}
                                    description={c.description}
                                    quote={c.quote}
                                    number={c.number}
                                  />
                                ))}
                              </SourcesContent>
                            </Sources>
                          ) : null}
                          {msg.role === 'assistant' && (msg.tasks?.length || 0) > 0 ? (
                            <div className="mt-2 space-y-2">
                              {msg.tasks?.map((t, ti) => (
                                <Task key={ti} open={i === messages.length - 1 && isLoading && t.status !== 'completed'}>
                                  <TaskTrigger title={`${t.title} · ${t.status === 'completed' ? '已完成' : t.status === 'in_progress' ? '进行中' : '待处理'}`} status={t.status} />
                                  <TaskContent>
                                    {t.items?.map((it, ii) => (
                                      <TaskItem key={ii}>
                                        {it.type === 'file' && it.file ? (
                                          <span>
                                            {it.text} <TaskItemFile>{it.file.name}</TaskItemFile>
                                          </span>
                                        ) : (
                                          it.text
                                        )}
                                      </TaskItem>
                                    ))}
                                  </TaskContent>
                                </Task>
                              ))}
                            </div>
                          ) : null}
                        </MessageContent>
                        {msg.role === 'assistant' && i === messages.length - 1 && (
                          <Actions className="mt-2">
                            <Action
                              label="Retry"
                              tooltip={isLoading ? "生成中..." : "重试生成"}
                              onClick={() => retryAssistantAtIndex(i)}
                              disabled={isLoading}
                            >
                              <RotateCcw className="size-4" />
                            </Action>
                            <Action
                              label="Copy"
                              tooltip="复制内容"
                              onClick={() => copyText(msg.content)}
                            >
                              <Copy className="size-4" />
                            </Action>
                          </Actions>
                        )}
                        {msg.role === 'assistant' && isSelectedBranch && branchIndices.length > 1 && (
                          <Branch defaultBranch={branchIndex} onBranchChange={(idx) => setBranchIndex(idx)} count={branchIndices.length}>
                            <BranchSelector from="assistant" className="mt-1">
                              <BranchPrevious />
                              <BranchPage />
                              <BranchNext />
                            </BranchSelector>
                          </Branch>
                        )}
                      </Message>
                      )
                    })}
                    {isLoading && (
                      <Message from="assistant">
                        <MessageAvatar className="bg-white/10" src="/logo.svg" name="AI" />
                        <MessageContent>
                          <AssistantBubble className="bg-white/10 text-white">
                            <Loader size={16} />
                          </AssistantBubble>
                        </MessageContent>
                      </Message>
                    )}
                    <div ref={messagesEndRef} />
                      </div>
                    </ConversationContent>
                    <ConversationScrollButton onClick={() => setAutoScroll(true)} />
                  </Conversation>
                </AssistantModalContent>

                {/* Input */}
                <AssistantModalFooter className="border-white/10">
                  <PromptInput onSubmit={(e) => { e.preventDefault(); handleSend() }}>
                    <PromptInputTextarea
                      value={input}
                      onChange={(e) => setInput(e.currentTarget.value)}
                      placeholder="向 AI 助手提问..."
                      disabled={isLoading}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    />
                    <PromptInputToolbar>
                      <PromptInputTools>
                        <PromptInputButton type="button" aria-label="附件">
                          <PaperclipIcon size={16} />
                        </PromptInputButton>
                        <PromptInputButton type="button" aria-label="语音">
                          <MicIcon size={16} />
                        </PromptInputButton>
                        <PromptInputButton
                          type="button"
                          aria-label={enableSearch ? "联网搜索：开" : "联网搜索：关"}
                          onClick={() => { const nv = !enableSearch; setEnableSearch(nv); try { localStorage.setItem('ai-enable-search', String(nv)) } catch {} }}
                          className={enableSearch ? "text-blue-300 bg-blue-500/20 border-blue-500/30" : "text-white/70 bg-white/5 border-white/10"}
                        >
                          <Globe size={16} />
                        </PromptInputButton>
                        <PromptInputModelSelect value={selectedModel || aiSettings?.model || "gpt-3.5-turbo"} onValueChange={setSelectedModel}>
                          <PromptInputModelSelectTrigger>
                            <PromptInputModelSelectValue />
                          </PromptInputModelSelectTrigger>
                          <PromptInputModelSelectContent>
                            <PromptInputModelSelectItem value={aiSettings?.model || "gpt-3.5-turbo"}>{aiSettings?.model || "gpt-3.5-turbo"}</PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="gpt-4o">GPT-4o</PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="gpt-4o-mini">GPT-4o mini</PromptInputModelSelectItem>
                          </PromptInputModelSelectContent>
                        </PromptInputModelSelect>
                      </PromptInputTools>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">{messages.length} 条消息</span>
                        <PromptInputSubmit disabled={!input.trim() || isLoading} status={isLoading ? 'loading' : 'idle'} />
                      </div>
                    </PromptInputToolbar>
                  </PromptInput>
                </AssistantModalFooter>
              </AssistantModal>
            </div>
            </GridLayout>
          </div>
        </div>
      </div>

      {/* AI Settings Dialog */}
      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSettingsSave}
      />
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

