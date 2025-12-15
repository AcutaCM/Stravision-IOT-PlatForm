"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  Rocket, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Layout,
  Clock,
  Bell,
  Link as LinkIcon,
  History,
  Smartphone
} from "lucide-react"
import Image from "next/image"

const ANNOUNCEMENT_VERSION = "update-announcement-v2.1"
const HIDE_KEY = `hide-${ANNOUNCEMENT_VERSION}`

export function UpdateAnnouncement() {
  const [open, setOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    // Check if the user has chosen not to see this specific version
    const shouldHide = localStorage.getItem(HIDE_KEY)
    
    // If not hidden, show after a delay
    if (!shouldHide) {
      const timer = setTimeout(() => {
        setOpen(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    if (dontShowAgain) {
      localStorage.setItem(HIDE_KEY, "true")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogContent className="sm:max-w-[900px] p-0 border-none shadow-2xl bg-white dark:bg-slate-900 max-h-[85vh] md:max-h-none overflow-y-auto md:overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 md:min-h-[500px]">
          
          {/* Mobile Image (Visible only on small screens) */}
          <div className="relative w-full h-48 md:hidden bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden shrink-0">
             <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-full blur-3xl" />
             </div>
             <div className="relative z-10 h-full w-full p-6">
                <div className="relative w-full h-full">
                  <Image 
                    src="/announcement.svg" 
                    alt="Update Illustration" 
                    fill 
                    className="object-contain drop-shadow-xl"
                  />
                </div>
             </div>
          </div>

          {/* Left Column: Content */}
          <div className="p-6 md:p-12 flex flex-col justify-center relative z-10 bg-white dark:bg-slate-900">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              2.0.0 Fixes and Updates
            </h2>
            
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              我们持续优化 Stravision 平台，为您带来更流畅的体验。本次更新包含了一系列功能增强与问题修复，致力于为您提供卓越的智慧农业管理服务。
            </p>

            <div className="space-y-6 mb-8">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                Highlights:
              </h3>
              
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Layout className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug pt-1">
                    全新仪表盘布局，支持自由拖拽定制，打造您的专属工作台
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-red-500 dark:text-red-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug pt-1">
                    优化了会话超时处理机制，长时间未操作也能平滑恢复
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug pt-1">
                    新增消息通知视觉提醒，重要预警不再错过
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <LinkIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug pt-1">
                    公告模块支持超链接跳转，快速直达相关功能页面
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug pt-1">
                    新增设备控制历史记录功能，自动追踪所有操作日志，支持随时回溯查看
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug pt-1">
                    移动端体验优化，智能屏蔽桌面端引导，界面更清爽
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <Button 
                onClick={handleClose} 
                className="w-full md:w-fit rounded-full px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 text-base"
              >
                Read More
              </Button>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dont-show" 
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                />
                <Label 
                  htmlFor="dont-show" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-500 dark:text-slate-400"
                >
                  不再显示此版本更新公告
                </Label>
              </div>
            </div>
          </div>

          {/* Right Column: Illustration (Desktop) */}
          <div className="relative hidden md:flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 p-8">
            {/* Abstract Background Shapes */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-full blur-3xl" />
            </div>
            
            {/* Main Illustration Placeholder */}
            <div className="relative z-10 w-full max-w-sm aspect-square flex items-center justify-center">
               <div className="relative w-full h-full">
                  <Image 
                    src="/announcement.svg" 
                    alt="Update Illustration" 
                    fill 
                    className="object-contain drop-shadow-xl"
                  />
               </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
