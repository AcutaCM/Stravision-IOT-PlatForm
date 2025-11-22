import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

interface AISettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (settings: AISettings) => void
}

export function AISettingsDialog({ open, onOpenChange, onSave }: AISettingsDialogProps) {
  const [settings, setSettings] = useState<AISettings>({
    apiKey: "",
    apiUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    model: "qwen-turbo",
    systemPrompt:
      "你是莓界智慧农业平台的AI助手，专门帮助用户分析农业数据、提供种植建议和解答农业相关问题。请用专业但易懂的语言回答问题。\n\n重要提醒：如果需要提供参考来源，请确保所有链接和信息都是真实存在的，绝对不要编造虚假的网站或来源。如果不确定来源，请直接说明这是基于你的知识库回答，而不是提供虚假引用。",
  })

  const [apiType, setApiType] = useState<"dashscope" | "openai">("dashscope")

  useEffect(() => {
    // 从服务器加载设置
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
          if (
            effective.apiUrl?.includes("dashscope") ||
            effective.model?.startsWith("qwen")
          ) {
            setApiType("dashscope")
          } else {
            setApiType("openai")
          }
        } else {
          // 如果服务器没有设置，尝试从localStorage加载
          const saved = localStorage.getItem("ai-settings")
          if (saved) {
            const parsed = JSON.parse(saved)
            setSettings(parsed)
            if (
              parsed.apiUrl?.includes("dashscope") ||
              parsed.model?.startsWith("qwen")
            ) {
              setApiType("dashscope")
            } else {
              setApiType("openai")
            }
          }
        }
      } catch (e) {
        console.error("Failed to load AI settings:", e)
        // 回退到localStorage
        const saved = localStorage.getItem("ai-settings")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setSettings(parsed)
            if (
              parsed.apiUrl?.includes("dashscope") ||
              parsed.model?.startsWith("qwen")
            ) {
              setApiType("dashscope")
            } else {
              setApiType("openai")
            }
          } catch (parseError) {
            console.error("Failed to parse localStorage settings:", parseError)
          }
        }
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      // 保存到服务器
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        // 同时保存到localStorage作为备份
        localStorage.setItem("ai-settings", JSON.stringify(settings))
        onSave(settings)
        onOpenChange(false)
      } else {
        const error = await response.json()
        alert(`保存失败: ${error.error || "未知错误"}`)
      }
    } catch (e) {
      console.error("Failed to save AI settings:", e)
      // 如果服务器保存失败，至少保存到localStorage
      localStorage.setItem("ai-settings", JSON.stringify(settings))
      onSave(settings)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">AI 助手设置</DialogTitle>
          <DialogDescription className="text-white/60">
            配置 AI 助手的 API 密钥和参数，支持 OpenAI 及兼容服务
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2.5">
            <Label className="text-white text-sm font-medium">API 类型</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={apiType === "dashscope" ? "default" : "outline"}
                onClick={() => {
                  setApiType("dashscope")
                  setSettings({
                    ...settings,
                    apiUrl:
                      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                    model: "qwen-turbo",
                  })
                }}
                className={
                  apiType === "dashscope"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "border-white/20 bg-white/5 hover:bg-white/10 text-white"
                }
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
                    model: "gpt-3.5-turbo",
                  })
                }}
                className={
                  apiType === "openai"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "border-white/20 bg-white/5 hover:bg-white/10 text-white"
                }
              >
                OpenAI
              </Button>
            </div>
            <p className="text-xs text-white/50">
              {apiType === "dashscope"
                ? "使用阿里云通义千问模型（推荐国内用户）"
                : "使用 OpenAI GPT 模型"}
            </p>
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="apiKey" className="text-white text-sm font-medium">
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-blue-500/50"
            />
            <p className="text-xs text-white/50">你的 API 密钥将安全存储在本地浏览器中</p>
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="apiUrl" className="text-white text-sm font-medium">
              API URL
            </Label>
            <Input
              id="apiUrl"
              placeholder={
                apiType === "dashscope"
                  ? "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
                  : "https://api.openai.com/v1/chat/completions"
              }
              value={settings.apiUrl}
              onChange={(e) =>
                setSettings({ ...settings, apiUrl: e.target.value })
              }
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-blue-500/50"
            />
            <p className="text-xs text-white/50">
              {apiType === "dashscope"
                ? "阿里云 DashScope API 端点"
                : "支持 OpenAI、Azure OpenAI 及其他兼容端点"}
            </p>
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="model" className="text-white text-sm font-medium">
              模型
            </Label>
            <Input
              id="model"
              placeholder={
                apiType === "dashscope" ? "qwen-turbo" : "gpt-3.5-turbo"
              }
              value={settings.model}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value })
              }
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-blue-500/50"
            />
            <p className="text-xs text-white/50">
              {apiType === "dashscope"
                ? "例如: qwen-turbo, qwen-plus, qwen-max"
                : "例如: gpt-3.5-turbo, gpt-4, gpt-4-turbo"}
            </p>
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="systemPrompt" className="text-white text-sm font-medium">系统提示词</Label>
            <Textarea
              id="systemPrompt"
              placeholder="输入系统提示词..."
              value={settings.systemPrompt}
              onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
              className="min-h-[120px] resize-none bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-blue-500/50"
            />
            <p className="text-xs text-white/50">定制 AI 助手的角色和行为方式</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
          >
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
