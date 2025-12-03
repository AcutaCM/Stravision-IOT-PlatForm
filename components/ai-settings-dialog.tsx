"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Settings, 
  Box, 
  CheckCircle2,
  Bot,
  Sparkles,
  Globe,
  Palette,
  LayoutGrid
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

interface AISettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (settings: AISettings) => void
}

type TabId = "model" | "general"

export function AISettingsDialog({ open, onOpenChange, onSave }: AISettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabId>("model")
  const [settings, setSettings] = useState<AISettings>({
    apiKey: "",
    apiUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    model: "",
    systemPrompt:
      "你是莓界智慧农业平台的AI助手，专门帮助用户分析农业数据、提供种植建议和解答农业相关问题。请用专业但易懂的语言回答问题。\n\n重要提醒：如果需要提供参考来源，请确保所有链接和信息都是真实存在的，绝对不要编造虚假的网站或来源。如果不确定来源，请直接说明这是基于你的知识库回答，而不是提供虚假引用。",
  })

  const [apiType, setApiType] = useState<"dashscope" | "openai">("dashscope")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings")
        if (response.ok) {
          const serverSettings = await response.json()
          const savedStr = localStorage.getItem("ai-settings")
          const localSettings = savedStr ? JSON.parse(savedStr) : null
          const shouldUseLocal = !serverSettings?.apiKey || String(serverSettings.apiKey).trim() === ''
          const effective = shouldUseLocal && localSettings ? localSettings : serverSettings
          setSettings(effective)
          if (effective.apiUrl?.includes("dashscope") || effective.model?.startsWith("qwen")) {
            setApiType("dashscope")
          } else {
            setApiType("openai")
          }
        } else {
          const saved = localStorage.getItem("ai-settings")
          if (saved) {
            const parsed = JSON.parse(saved)
            setSettings(parsed)
            if (parsed.apiUrl?.includes("dashscope") || parsed.model?.startsWith("qwen")) {
              setApiType("dashscope")
            } else {
              setApiType("openai")
            }
          }
        }
      } catch {
        const saved = localStorage.getItem("ai-settings")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setSettings(parsed)
            if (parsed.apiUrl?.includes("dashscope") || parsed.model?.startsWith("qwen")) {
              setApiType("dashscope")
            } else {
              setApiType("openai")
            }
          } catch {}
        }
      }
    }
    loadSettings()
  }, [open])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (response.ok) {
        localStorage.setItem("ai-settings", JSON.stringify(settings))
        onSave(settings)
        onOpenChange(false)
      } else {
        const error = await response.json()
        alert(`保存失败: ${error.error || "未知错误"}`)
      }
    } catch {
      localStorage.setItem("ai-settings", JSON.stringify(settings))
      onSave(settings)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 h-[650px] flex flex-row border-none shadow-2xl bg-white dark:bg-zinc-950 sm:rounded-2xl">
         {/* Sidebar */}
         <div className="w-64 bg-gray-50/80 dark:bg-zinc-900/50 border-r border-gray-200/50 dark:border-white/10 p-4 flex flex-col gap-2 shrink-0">
            <div className="px-2 py-3 mb-2">
               <h2 className="font-bold text-xl tracking-tight">Settings</h2>
            </div>
            
            <SidebarItem 
              icon={Box} 
              label="模型设置" 
              active={activeTab === "model"} 
              onClick={() => setActiveTab("model")} 
            />
            <SidebarItem 
              icon={Settings} 
              label="常规" 
              active={activeTab === "general"} 
              onClick={() => setActiveTab("general")} 
            />
         </div>

         {/* Content Area */}
         <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-zinc-950 z-10">
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {activeTab === "model" ? "模型配置" : "常规设置"}
                </DialogTitle>
                <DialogDescription className="mt-1.5">
                  {activeTab === "model" ? "配置您的专属 AI 助手模型参数" : "调整应用的基础设置"}
                </DialogDescription>
              </div>
              <div className="flex gap-3">
                 <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                 <Button onClick={handleSave} disabled={isSaving} className="min-w-[80px]">
                   {isSaving ? "保存中..." : "保存"}
                 </Button>
              </div>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto p-8">
               {activeTab === "model" && (
                 <div className="space-y-8 max-w-2xl">
                    {/* API Type Selector */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">服务提供商</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <ProviderCard 
                          active={apiType === "dashscope"} 
                          onClick={() => {
                            setApiType("dashscope")
                            setSettings({
                              ...settings,
                              apiUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                            })
                          }}
                          icon={Sparkles}
                          title="阿里云百炼"
                          desc="推荐国内用户，Qwen系列"
                        />
                        <ProviderCard 
                          active={apiType === "openai"} 
                          onClick={() => {
                            setApiType("openai")
                            setSettings({
                              ...settings,
                              apiUrl: "https://api.openai.com/v1/chat/completions",
                            })
                          }}
                          icon={Bot}
                          title="OpenAI"
                          desc="GPT-3.5, GPT-4"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="model">模型名称</Label>
                        <Input 
                          id="model" 
                          placeholder={apiType === "dashscope" ? "例如: qwen-plus" : "例如: gpt-3.5-turbo"} 
                          value={settings.model} 
                          onChange={(e) => setSettings({ ...settings, model: e.target.value })} 
                          className="h-10"
                        />
                        <p className="text-[13px] text-muted-foreground">
                          {apiType === "dashscope" 
                            ? "可用模型: qwen-turbo, qwen-plus, qwen-max, qwen-vl-plus, qwen-vl-max" 
                            : "可用模型: gpt-3.5-turbo, gpt-4, gpt-4-turbo"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input 
                          id="apiKey" 
                          type="password"
                          placeholder="sk-..." 
                          value={settings.apiKey} 
                          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} 
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiUrl">API URL</Label>
                        <Input 
                          id="apiUrl" 
                          value={settings.apiUrl} 
                          onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })} 
                          className="h-10 font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="systemPrompt">系统提示词</Label>
                        <Textarea 
                          id="systemPrompt" 
                          value={settings.systemPrompt} 
                          onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })} 
                          className="min-h-[120px] resize-none leading-relaxed"
                        />
                        <p className="text-[13px] text-muted-foreground">定义 AI 助手的角色和行为准则。</p>
                      </div>
                    </div>
                 </div>
               )}

               {activeTab === "general" && (
                 <div className="space-y-8 max-w-2xl">
                    <div className="space-y-4">
                      <Label>界面主题</Label>
                      <div className="grid grid-cols-3 gap-3">
                         <div 
                           className={cn(
                             "border-2 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                             theme === 'system' 
                               ? "border-blue-500 bg-blue-50/50" 
                               : "border-gray-200 hover:border-gray-300"
                           )}
                           onClick={() => setTheme('system')}
                         >
                            <div className="w-full aspect-video bg-gradient-to-br from-white to-zinc-900 rounded border border-gray-200 shadow-sm"></div>
                            <span className={cn("text-sm font-medium", theme === 'system' ? "text-blue-700" : "text-gray-600")}>System</span>
                         </div>
                         <div 
                           className={cn(
                             "border-2 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                             theme === 'light' 
                               ? "border-blue-500 bg-blue-50/50" 
                               : "border-gray-200 hover:border-gray-300"
                           )}
                           onClick={() => setTheme('light')}
                         >
                            <div className="w-full aspect-video bg-white rounded border border-gray-200 shadow-sm"></div>
                            <span className={cn("text-sm font-medium", theme === 'light' ? "text-blue-700" : "text-gray-600")}>Light</span>
                         </div>
                         <div 
                           className={cn(
                             "border-2 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                             theme === 'dark' 
                               ? "border-blue-500 bg-blue-50/50" 
                               : "border-gray-200 hover:border-gray-300"
                           )}
                           onClick={() => setTheme('dark')}
                         >
                            <div className="w-full aspect-video bg-zinc-900 rounded border border-gray-800 shadow-sm"></div>
                            <span className={cn("text-sm font-medium", theme === 'dark' ? "text-blue-700" : "text-gray-600")}>Dark</span>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                       <Label>语言 (Language)</Label>
                       <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/30 cursor-pointer">
                             <div className="flex items-center gap-3">
                                <Globe size={18} className="text-blue-600" />
                                <span className="text-sm font-medium">中文 (简体)</span>
                             </div>
                             <CheckCircle2 size={18} className="text-blue-600" />
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:bg-gray-50 cursor-pointer opacity-60">
                             <div className="flex items-center gap-3">
                                <Globe size={18} className="text-gray-500" />
                                <span className="text-sm font-medium">English (US)</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
         </div>
      </DialogContent>
    </Dialog>
  )
}

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
        active 
          ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-white/10" 
          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/5"
      )}
    >
      <Icon size={18} className={cn(active ? "text-blue-600 dark:text-blue-400" : "text-gray-400")} />
      {label}
    </button>
  )
}

function ProviderCard({ active, onClick, icon: Icon, title, desc }: { active: boolean, onClick: () => void, icon: any, title: string, desc: string }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
        active 
          ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20" 
          : "border-gray-200 hover:border-gray-300 bg-white"
      )}
    >
       <div className="flex items-start justify-between mb-2">
          <div className={cn("p-2 rounded-lg", active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>
             <Icon size={20} />
          </div>
          {active && <CheckCircle2 size={18} className="text-blue-500" />}
       </div>
       <div className="font-semibold text-sm text-gray-900 mb-0.5">{title}</div>
       <div className="text-xs text-gray-500">{desc}</div>
    </div>
  )
}
