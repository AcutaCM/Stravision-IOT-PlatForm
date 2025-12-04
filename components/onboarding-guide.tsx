"use client"

import { useEffect, useRef, useState } from "react"
import { driver, DriveStep } from "driver.js"
import "driver.js/dist/driver.css"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

// Define steps with an optional route property
type ExtendedDriveStep = DriveStep & { route?: string }

export function OnboardingGuide() {
  const driverObj = useRef<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  
  // Steps configuration
  const tourSteps: ExtendedDriveStep[] = [
    // --- Step 0: Welcome & Monitor Nav ---
    {
      element: "#nav-monitor",
      popover: {
        title: "农作物监测",
        description: "点击此处进入监测页面，查看实时的环境数据、视频监控流以及设备运行状态。",
        side: "bottom",
      },
      route: "/monitor"
    },
    // --- Step 1: Monitor Page - Video ---
    {
      element: "#monitor-player",
      popover: {
        title: "实时监控 & AI 识别",
        description: "这里展示农作物的实时画面。开启 AI 识别后，系统会自动分析植物生长状态。",
        side: "right",
      },
      route: "/monitor"
    },
    // --- Step 2: Monitor Page - Data Grid ---
    {
      element: "#monitor-data-grid",
      popover: {
        title: "环境数据",
        description: "实时显示温度、湿度、光照、CO2 等传感器数据，让您掌握第一手环境信息。",
        side: "left",
      },
      route: "/monitor"
    },
    
    // --- Step 3: Device Control Nav ---
    {
      element: "#nav-device-control",
      popover: {
        title: "硬件设备控制",
        description: "切换到此页面，您可以远程手动控制水泵、风扇、补光灯等设备。",
        side: "bottom",
      },
      route: "/device-control"
    },
    // --- Step 4: Device Control Page - Grid ---
    {
      element: "#device-control-grid",
      popover: {
        title: "设备开关",
        description: "直观的卡片式开关，点击即可控制设备启停。支持调节亮度的设备会有滑动条。",
        side: "top",
      },
      route: "/device-control"
    },

    // --- Step 5: Dashboard Nav ---
    {
      element: "#nav-dashboard",
      popover: {
        title: "数据看板",
        description: "进入数据看板，查看更详细的历史数据趋势和统计图表。",
        side: "bottom",
      },
      route: "/dashboard"
    },
    // --- Step 6: Dashboard Page - Charts ---
    {
      element: "#dashboard-charts",
      popover: {
        title: "可视化图表",
        description: "拖拽式布局的数据大屏，您可以自由调整图表位置和大小，定制专属看板。",
        side: "top",
      },
      route: "/dashboard"
    },

    // --- Step 7: AI Assistant Nav ---
    {
      element: "#nav-ai-assistant",
      popover: {
        title: "AI 助手",
        description: "遇到种植问题？来问问 AI 助手吧，它能诊断病害、提供种植建议。",
        side: "bottom",
      },
      route: "/ai-assistant"
    },
    
    // --- Step 8: AI Assistant - Welcome Area ---
    {
      element: "#ai-welcome-area",
      popover: {
        title: "对话区域",
        description: "这里显示您的对话历史。如果是新会话，您会看到常用的快捷指令和天气信息。",
        side: "top",
      },
      route: "/ai-assistant"
    },

    // --- Step 9: AI Assistant - Model Selector ---
    // Use conditional selector based on what's visible
    {
      element: "#ai-model-selector-nav",
      popover: {
        title: "模型选择",
        description: "在顶部栏或输入框上方，您可以切换不同的 AI 模型（如 Qwen-VL, Qwen-Max 等）以适应不同任务。",
        side: "bottom",
      },
      route: "/ai-assistant"
    },

    // --- Step 10: AI Assistant - Quick Actions ---
    {
      element: "#ai-quick-actions",
      popover: {
        title: "快捷指令",
        description: "点击这些卡片可以快速执行常用任务，如诊断病害、生成周报等。",
        side: "top",
      },
      route: "/ai-assistant"
    },

    // --- Step 11: AI Assistant - Input ---
    {
      element: "#ai-input-area",
      popover: {
        title: "输入区域",
        description: "在这里输入文字与 AI 对话。",
        side: "top",
      },
      route: "/ai-assistant"
    },

    // --- Step 12: AI Assistant - Tools ---
    {
      element: "#ai-input-tools",
      popover: {
        title: "多模态工具",
        description: "使用这些按钮上传图片/文件、开启联网搜索或启用深度思考模式。",
        side: "top",
      },
      route: "/ai-assistant"
    },

    // --- Step 13: User Menu ---
    {
      element: "#user-menu-trigger",
      popover: {
        title: "用户中心",
        description: "管理您的个人资料、修改密码或退出登录。",
        side: "bottom",
        align: "end"
      },
      // Global element, any route is fine, but let's keep it on current
    },
  ]

  useEffect(() => {
    driverObj.current = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: "完成",
      nextBtnText: "下一步",
      prevBtnText: "上一步",
      steps: tourSteps,
      
      // Handle navigation when clicking Next
      onNextClick: (element, step, { state }) => {
        const currentStepIndex = state.activeIndex
        const nextStepIndex = currentStepIndex + 1

        if (nextStepIndex < tourSteps.length) {
          const nextStep = tourSteps[nextStepIndex]
          
          // If the next step requires a different route
          if (nextStep.route && window.location.pathname !== nextStep.route) {
            // 1. Destroy current highlight to avoid glitches
            driverObj.current.destroy()
            
            // 2. Navigate
            router.push(nextStep.route)
            
            // 3. Save state to localStorage so we can resume after navigation
            localStorage.setItem("tour-active", "true")
            localStorage.setItem("tour-step", nextStepIndex.toString())
            
            // Stop default driver action (it would try to find element on current page)
            return
          }
        }
        
        // If no navigation needed, proceed normally
        driverObj.current.moveNext()
      },
      
      // Handle Previous button similarly if needed (optional for MVP)
      onPrevClick: (element, step, { state }) => {
         const currentStepIndex = state.activeIndex
         const prevStepIndex = currentStepIndex - 1
         
         if (prevStepIndex >= 0) {
            const prevStep = tourSteps[prevStepIndex]
            if (prevStep.route && window.location.pathname !== prevStep.route) {
                driverObj.current.destroy()
                router.push(prevStep.route)
                localStorage.setItem("tour-active", "true")
                localStorage.setItem("tour-step", prevStepIndex.toString())
                return
            }
         }
         driverObj.current.movePrevious()
      },

      onDestroyed: () => {
         // Only clear if we are NOT navigating
         // We can check if we just set the flag
         // But simpler: we clear the flag when we resume
      }
    })

    // Helper to wait for element
    const waitForElement = (selector: string, timeout = 3000) => {
        return new Promise((resolve) => {
            const startTime = Date.now()
            const check = () => {
                if (document.querySelector(selector)) {
                    resolve(true)
                } else if (Date.now() - startTime > timeout) {
                    resolve(false)
                } else {
                    requestAnimationFrame(check)
                }
            }
            check()
        })
    }

    // Check if we need to resume a tour
    const isTourActive = localStorage.getItem("tour-active")
    const tourStep = localStorage.getItem("tour-step")

    if (isTourActive === "true" && tourStep) {
      const stepIndex = parseInt(tourStep)
      const stepConfig = tourSteps[stepIndex]
      
      // Resume tour at specific step
      // Use dynamic wait instead of fixed timeout
      if (stepConfig?.element) {
          waitForElement(stepConfig.element as string).then(() => {
              // Extra small delay for layout stability
              setTimeout(() => {
                  driverObj.current.drive(stepIndex)
                  localStorage.removeItem("tour-active") // Clear flag once resumed
                  localStorage.removeItem("tour-step")
              }, 500)
          })
      }
    } else {
        // Check if first time visit ever
        const hasSeenGuide = localStorage.getItem("has-seen-guide")
        // Don't start guide on login or register pages
        const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/"
        
        if (!hasSeenGuide && !isAuthPage) {
            // Wait for first element usually #nav-monitor
            waitForElement("#nav-monitor").then(() => {
                setTimeout(() => {
                    driverObj.current.drive()
                    localStorage.setItem("has-seen-guide", "true")
                }, 1500)
            })
        }
    }

  }, [pathname, router]) // Re-run effect when pathname changes to check for resume

  // Don't show help button on auth pages
  if (pathname === "/login" || pathname === "/register" || pathname === "/") {
    return null
  }

  const startTour = () => {
    // Reset state
    localStorage.removeItem("tour-active")
    localStorage.removeItem("tour-step")
    
    // If we are not on the first page, navigate there first?
    // Or just start. The first step is #nav-monitor which is global.
    // But Step 1 is #monitor-player which is on /monitor.
    // Safer to start from /monitor if we want linear flow.
    
    if (pathname !== "/monitor") {
        router.push("/monitor")
        localStorage.setItem("tour-active", "true")
        localStorage.setItem("tour-step", "0")
    } else {
        driverObj.current?.drive(0)
    }
  }

  return (
    <Button 
        variant="ghost" 
        size="icon" 
        className="fixed bottom-4 right-4 z-50 rounded-full bg-white shadow-lg border hover:bg-gray-50 text-gray-500"
        onClick={startTour}
        title="新手引导"
    >
        <HelpCircle className="size-5" />
    </Button>
  )
}
