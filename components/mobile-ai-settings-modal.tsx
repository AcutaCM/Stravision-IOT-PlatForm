import { useState, useEffect } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
 

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

interface MobileAISettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (settings: AISettings) => void
}

export function MobileAISettingsModal({ open, onOpenChange, onSave }: MobileAISettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>({
    apiKey: "",
    apiUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    model: "",
    systemPrompt:
      "你是莓界智慧农业平台的AI助手，专门帮助用户分析农业数据、提供种植建议和解答农业相关问题。请用专业但易懂的语言回答问题。\n\n重要提醒：如果需要提供参考来源，请确保所有链接和信息都是真实存在的，绝对不要编造虚假的网站或来源。如果不确定来源，请直接说明这是基于你的知识库回答，而不是提供虚假引用。",
  })

  const [apiType, setApiType] = useState<"dashscope" | "openai">("dashscope")

  useEffect(() => {
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
  }, [])

  const handleSave = async () => {
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 w-full max-w-none rounded-t-3xl bg-background shadow-lg border border-border overflow-hidden h-[88vh] sm:left-1/2 sm:top-1/2 sm:inset-x-auto sm:h-auto sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/10 dark:bg-black/10 backdrop-blur-xl">
            <div className="text-sm font-semibold">AI 助手设置</div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="rounded-full">关闭</Button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(88vh-56px-64px)] sm:h-auto">
            <div className="grid gap-2.5">
              <Label className="text-sm font-medium">API 类型</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={apiType === "dashscope" ? "default" : "outline"}
                  onClick={() => {
                    setApiType("dashscope")
                    setSettings({
                      ...settings,
                      apiUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                    })
                  }}
                  className={apiType === "dashscope" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" : "border-border bg-muted/50 hover:bg-muted text-foreground"}
                >
                  阿里云 DashScope
                </Button>
                <Button
                  type="button"
                  variant={apiType === "openai" ? "default" : "outline"}
                  onClick={() => {
                    setApiType("openai")
                    setSettings({
                      ...settings,
                      apiUrl: "https://api.openai.com/v1/chat/completions",
                    })
                  }}
                  className={apiType === "openai" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" : "border-border bg-muted/50 hover:bg-muted text-foreground"}
                >
                  OpenAI
                </Button>
              </div>
              <span className="text-xs text-muted-foreground/70">
                {apiType === "dashscope" ? "使用通义千问模型" : "使用 OpenAI 兼容模型"}
              </span>
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="model" className="text-sm font-medium">模型</Label>
              <Input id="model" placeholder="例如: qwen-plus" value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })} className="bg-white/10 dark:bg-black/10 border-white/10" />
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="apiKey" className="text-sm font-medium">API Key</Label>
              <Input id="apiKey" type="password" placeholder="sk-..." value={settings.apiKey} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} className="bg-white/10 dark:bg-black/10 border-white/10" />
              <span className="text-xs text-muted-foreground/70">仅保存在本地浏览器</span>
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="apiUrl" className="text-sm font-medium">API URL</Label>
              <Input id="apiUrl" placeholder={apiType === "dashscope" ? "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation" : "https://api.openai.com/v1/chat/completions"} value={settings.apiUrl} onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })} className="bg-white/10 dark:bg-black/10 border-white/10" />
              <span className="text-xs text-muted-foreground/70">端点地址</span>
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="systemPrompt" className="text-sm font-medium">系统提示词</Label>
              <Textarea id="systemPrompt" placeholder="输入系统提示词..." value={settings.systemPrompt} onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })} className="min-h-[120px] bg-white/10 dark:bg-black/10 border-white/10" />
            </div>
          </div>

          <div className="p-4 border-t border-white/10 bg-white/10 dark:bg-black/10 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border bg-muted/50 hover:bg-muted text-foreground">取消</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">保存设置</Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

export default MobileAISettingsModal
