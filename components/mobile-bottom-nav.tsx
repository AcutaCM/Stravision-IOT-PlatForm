"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion, LayoutGroup } from "framer-motion"
import {
  HomeIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  UserIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline"
import {
  HomeIcon as HomeIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  UserIcon as UserIconSolid,
  SparklesIcon as SparklesIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid
} from "@heroicons/react/24/solid"

interface NavItem {
  href: string
  label: string
  icon: any
  iconSolid: any
  id: string
}

const navItems: NavItem[] = [
  { href: "/monitor-ios", label: "监测", icon: HomeIcon, iconSolid: HomeIconSolid, id: "nav-monitor-ios" },
  { href: "/device-control-ios", label: "设备", icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid, id: "nav-device-control-ios" },
  { href: "/dashboard-ios", label: "看板", icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid, id: "nav-dashboard-ios" },
  { href: "/ai-assistant-ios", label: "AI助手", icon: SparklesIcon, iconSolid: SparklesIconSolid, id: "nav-ai-assistant-ios" },
  { href: "/chat", label: "聊天", icon: ChatBubbleLeftRightIcon, iconSolid: ChatBubbleLeftRightIconSolid, id: "nav-chat" },
  { href: "/profile-ios", label: "我的", icon: UserIcon, iconSolid: UserIconSolid, id: "nav-profile-ios" },
]

export function MobileBottomNav({ position = "fixed" }: { position?: "fixed" | "sticky" }) {
  const pathname = usePathname()

  return (
    <div className={`${position === "fixed" ? "fixed" : "sticky"} bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-4`}>
      <nav className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-white/20 dark:border-white/10">
        <div className="flex items-center gap-2">
          <LayoutGroup>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = isActive ? item.iconSolid : item.icon
  
              return (
                <Link key={item.href} href={item.href} className="relative" id={item.id}>
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-blue-600 rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <div className={`relative px-4 py-2 rounded-full transition-colors duration-200 ${isActive ? "text-white" : "text-slate-600 dark:text-slate-400"
                      }`}>
                      <Icon className="size-6" />
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </LayoutGroup>
        </div>
      </nav>
    </div>
  )
}
