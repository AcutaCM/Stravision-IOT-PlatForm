"use client"

import { CloudIcon, Cog6ToothIcon, ChartBarIcon, SparklesIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

export function PageNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: "/monitor", icon: CloudIcon, label: "农作物监测", id: "nav-monitor" },
    { href: "/device-control", icon: Cog6ToothIcon, label: "硬件设备控制", id: "nav-device-control" },
    { href: "/dashboard", icon: ChartBarIcon, label: "数据看板", id: "nav-dashboard" },
    { href: "/ai-assistant", icon: SparklesIcon, label: "AI 助手", id: "nav-ai-assistant" },
  ]

  const activeIndex = navItems.findIndex((item) => pathname === item.href)
  const [selectedIndex, setSelectedIndex] = useState(activeIndex === -1 ? 0 : activeIndex)

  // Sync state with pathname changes (e.g. browser back button or external navigation)
  useEffect(() => {
    if (activeIndex !== -1) {
      setSelectedIndex(activeIndex)
    }
  }, [pathname, activeIndex])

  return (
    <div className="relative rounded-full bg-[#162236]/80 backdrop-blur-md p-1.5 h-12 flex items-center gap-2 shadow-xl border border-white/5">
      {/* 导航按钮 */}
      {navItems.map((item, index) => {
        const Icon = item.icon
        const isActive = index === selectedIndex

        return (
          <Link
            key={item.href}
            href={item.href}
            id={item.id}
            className="relative z-10 h-9 rounded-full px-5 flex items-center gap-2 transition-colors duration-200"
            onClick={(e) => {
              e.preventDefault()
              if (selectedIndex !== index) setSelectedIndex(index)
              setTimeout(() => router.push(item.href), 200)
            }}
          >
            {/* 激活状态的背景 - 使用 layoutId 实现共享布局动画 */}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}

            {/* 图标和文字 */}
            <motion.div
              className="relative z-10 flex items-center gap-2"
              animate={{
                color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
              }}
              transition={{ duration: 0.2 }}
            >
              {item.href === "/ai-assistant" ? (
                <div className="size-[18px] rounded-full overflow-hidden">
                  <Image src="/logo.gif" alt="AI" width={18} height={18} className="object-cover" unoptimized />
                </div>
              ) : (
                <Icon className="size-[18px]" />
              )}
              <span className="text-sm font-medium">{item.label}</span>
            </motion.div>
          </Link>
        )
      })}
    </div>
  )
}
