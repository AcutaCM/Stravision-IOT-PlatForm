"use client"

import { CloudSun, Settings, Activity } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useState } from "react"

export function PageNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: "/monitor", icon: CloudSun, label: "农作物监测" },
    { href: "/device-control", icon: Settings, label: "硬件设备控制" },
    { href: "/dashboard", icon: Activity, label: "数据看板" },
  ]

  const activeIndex = navItems.findIndex((item) => pathname === item.href)
  const [selectedIndex, setSelectedIndex] = useState(activeIndex === -1 ? 0 : activeIndex)

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
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </motion.div>
          </Link>
        )
      })}
    </div>
  )
}
