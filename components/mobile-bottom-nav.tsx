"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  HomeIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  UserIcon,
  SparklesIcon
} from "@heroicons/react/24/outline"
import {
  HomeIcon as HomeIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  UserIcon as UserIconSolid,
  SparklesIcon as SparklesIconSolid
} from "@heroicons/react/24/solid"

interface NavItem {
  href: string
  label: string
  icon: any
  iconSolid: any
}

const navItems: NavItem[] = [
  { href: "/monitor-ios", label: "监测", icon: HomeIcon, iconSolid: HomeIconSolid },
  { href: "/device-control-ios", label: "设备", icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid },
  { href: "/dashboard-ios", label: "看板", icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
  { href: "/ai-assistant", label: "AI助手", icon: SparklesIcon, iconSolid: SparklesIconSolid },
  { href: "/profile", label: "我的", icon: UserIcon, iconSolid: UserIconSolid },
]

export function MobileBottomNav({ position = "fixed" }: { position?: "fixed" | "sticky" }) {
  const pathname = usePathname()

  return (
    <div className={`${position === "fixed" ? "fixed" : "sticky"} bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-4`}>
      <nav className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-white/20 dark:border-white/10">
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = isActive ? item.iconSolid : item.icon

            return (
              <Link key={item.href} href={item.href} className="relative">
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
        </div>
      </nav>
    </div>
  )
}
