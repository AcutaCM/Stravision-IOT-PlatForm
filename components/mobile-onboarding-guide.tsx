"use client"

import { useEffect, useRef } from "react"
import { driver, DriveStep } from "driver.js"
import "driver.js/dist/driver.css"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

// Define steps with an optional route property
type ExtendedDriveStep = DriveStep & { route?: string }

export function MobileOnboardingGuide() {
  const driverObj = useRef<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  
  // Mobile Steps Configuration
  const tourSteps: ExtendedDriveStep[] = [
    // --- Step 0: Welcome & Monitor Tab ---
    {
      element: "#nav-monitor-ios",
      popover: {
        title: "监测中心",
        description: "这是首页，您可以在这里查看环境数据和实时监控。",
        side: "top",
      },
      route: "/monitor-ios"
    },
    // --- Step 1: Weather Info ---
    {
      element: "#mobile-weather-row",
      popover: {
        title: "环境数据",
        description: "顶部显示实时的温度、湿度和空气质量信息。",
        side: "bottom",
      },
      route: "/monitor-ios"
    },
    // --- Step 2: Video Player ---
    {
      element: "#mobile-video-player",
      popover: {
        title: "实时监控",
        description: "观看大棚内的实时视频流。支持全屏查看。",
        side: "bottom",
      },
      route: "/monitor-ios"
    },
    // --- Step 3: Room Tabs ---
    {
      element: "#mobile-room-tabs",
      popover: {
        title: "区域切换",
        description: "点击这里切换不同的大棚或种植区域。",
        side: "bottom",
      },
      route: "/monitor-ios"
    },
    // --- Step 4: Device Grid (Monitor) ---
    {
      element: "#mobile-device-grid",
      popover: {
        title: "快速控制",
        description: "这里展示常用设备的状态，并支持快速开关。",
        side: "top",
      },
      route: "/monitor-ios"
    },

    // --- Step 5: Device Control Tab ---
    {
      element: "#nav-device-control-ios",
      popover: {
        title: "设备管理",
        description: "点击这里进入更详细的设备控制页面。",
        side: "top",
      },
      route: "/device-control-ios"
    },
    // --- Step 6: Control Grid ---
    {
      element: "#mobile-control-grid",
      popover: {
        title: "全面控制",
        description: "管理所有设备的开关、调节灯光颜色和亮度等。",
        side: "top",
      },
      route: "/device-control-ios"
    },

    // --- Step 7: Dashboard Tab ---
    {
      element: "#nav-dashboard-ios",
      popover: {
        title: "数据看板",
        description: "查看历史数据趋势和详细的统计图表。",
        side: "top",
      },
      route: "/dashboard-ios"
    },

    // --- Step 8: AI Assistant Tab ---
    {
      element: "#nav-ai-assistant-ios",
      popover: {
        title: "AI 助手",
        description: "有任何种植问题？随时问我！支持语音对话和图片诊断。",
        side: "top",
      },
      route: "/ai-assistant-ios"
    },
    
    // --- Step 9: AI Settings (Mobile) ---
    {
      element: "#mobile-ai-settings-trigger",
      popover: {
        title: "API 设置",
        description: "重要：请点击左上角的设置图标配置 API Key。您需要输入阿里云 DashScope Key 才能正常使用 AI 对话功能。",
        side: "bottom",
      },
      route: "/ai-assistant-ios"
    },

    // --- Step 10: Profile Tab ---
    {
      element: "#nav-profile-ios",
      popover: {
        title: "个人中心",
        description: "管理您的账号设置和个人信息。",
        side: "top",
      },
      route: "/profile"
    }
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
        const currentStepIndex = state.activeIndex ?? 0
        const nextStepIndex = currentStepIndex + 1

        if (nextStepIndex < tourSteps.length) {
          const nextStep = tourSteps[nextStepIndex]
          
          // If the next step requires a different route
          if (nextStep.route && window.location.pathname !== nextStep.route) {
            driverObj.current.destroy()
            router.push(nextStep.route)
            
            // Save state to resume after navigation
            localStorage.setItem("mobile-tour-active", "true")
            localStorage.setItem("mobile-tour-step", nextStepIndex.toString())
            return
          }
        }
        driverObj.current.moveNext()
      },
      
      onPrevClick: (element, step, { state }) => {
         const currentStepIndex = state.activeIndex ?? 0
         const prevStepIndex = currentStepIndex - 1
         
         if (prevStepIndex >= 0) {
            const prevStep = tourSteps[prevStepIndex]
            if (prevStep.route && window.location.pathname !== prevStep.route) {
                driverObj.current.destroy()
                router.push(prevStep.route)
                localStorage.setItem("mobile-tour-active", "true")
                localStorage.setItem("mobile-tour-step", prevStepIndex.toString())
                return
            }
         }
         driverObj.current.movePrevious()
      }
    })

    // Check resume state
    const isTourActive = localStorage.getItem("mobile-tour-active")
    const tourStep = localStorage.getItem("mobile-tour-step")

    if (isTourActive === "true" && tourStep) {
      const stepIndex = parseInt(tourStep)
      const stepConfig = tourSteps[stepIndex]
      
      if (stepConfig?.element) {
          // Wait a bit for element to appear
          setTimeout(() => {
              driverObj.current.drive(stepIndex)
              localStorage.removeItem("mobile-tour-active")
              localStorage.removeItem("mobile-tour-step")
          }, 800)
      }
    } else {
        // Auto start on first visit (optional)
        const hasSeenMobileGuide = localStorage.getItem("has-seen-mobile-guide")
        // Don't auto-start on login/register
        const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/"
        
        if (!hasSeenMobileGuide && !isAuthPage && pathname === "/monitor-ios") {
            setTimeout(() => {
                driverObj.current.drive()
                localStorage.setItem("has-seen-mobile-guide", "true")
            }, 1500)
        }
    }

  }, [pathname, router])

  // Only show on mobile pages
  const isMobilePage = [
      "/monitor-ios", 
      "/device-control-ios", 
      "/dashboard-ios", 
      "/ai-assistant-ios",
      "/profile"
  ].includes(pathname)

  if (!isMobilePage) return null

  const startTour = () => {
    localStorage.removeItem("mobile-tour-active")
    localStorage.removeItem("mobile-tour-step")
    
    if (pathname !== "/monitor-ios") {
        router.push("/monitor-ios")
        localStorage.setItem("mobile-tour-active", "true")
        localStorage.setItem("mobile-tour-step", "0")
    } else {
        driverObj.current?.drive(0)
    }
  }

  return (
    <Button 
        variant="ghost" 
        size="icon" 
        className="fixed bottom-24 right-4 z-40 rounded-full bg-white/90 shadow-lg border hover:bg-white text-blue-600 backdrop-blur-sm"
        onClick={startTour}
        title="功能引导"
    >
        <HelpCircle className="size-6" />
    </Button>
  )
}
