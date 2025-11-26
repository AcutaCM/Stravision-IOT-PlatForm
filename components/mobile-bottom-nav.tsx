"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { SunIcon, Cog6ToothIcon, SparklesIcon, UserIcon } from "@heroicons/react/24/outline"
import Image from "next/image"

type MobileBottomNavProps = {
  position?: "sticky" | "fixed"
}

export function MobileBottomNav({ position = "sticky" }: MobileBottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/monitor-ios", label: "监测", kind: "sun" as const },
    { href: "/device-control-ios", label: "设备", kind: "settings" as const },
    { href: "/dashboard-ios", label: "看板", kind: "sparkles" as const },
    { href: "/ai-assistant", label: "AI助手", kind: "logo" as const },
    { href: "/profile", label: "个人", kind: "user" as const },
  ]

  const navIndexByPath: Record<string, number> = Object.fromEntries(navItems.map((n, i) => [n.href, i]))
  const activeIndex = navIndexByPath[pathname] ?? 0
  const [prevIndex] = useState<number>(() => { try { const s = localStorage.getItem("mobile-nav-last-index"); return s ? Number(s) : activeIndex } catch { return activeIndex } })
  useEffect(() => { try { localStorage.setItem("mobile-nav-last-index", String(activeIndex)) } catch {} }, [activeIndex])

  const configByPath: Record<string, { stiffness: number; damping: number }> = {
    "/monitor-ios": { stiffness: 420, damping: 28 },
    "/device-control-ios": { stiffness: 380, damping: 26 },
    "/dashboard-ios": { stiffness: 360, damping: 30 },
    "/ai-assistant": { stiffness: 320, damping: 24 },
    "/profile": { stiffness: 360, damping: 26 },
  }
  const { stiffness, damping } = configByPath[pathname] ?? { stiffness: 360, damping: 28 }

  const containerClass = position === "fixed"
    ? "fixed bottom-0 left-0 right-0 z-20 border-t border-white/5 bg-white/10 dark:bg-black/10 backdrop-blur-xl pb-safe shadow-[0_-8px_32px_0_rgba(31,38,135,0.05)]"
    : "sticky bottom-0 z-20 border-t border-white/5 bg-white/10 dark:bg-black/10 backdrop-blur-xl pb-safe shadow-[0_-8px_32px_0_rgba(31,38,135,0.05)]"

  return (
    <div className={containerClass}>
      <div className="relative">
        <motion.div
          initial={{ left: `${prevIndex * 20}%`, boxShadow: "0 8px 20px rgba(59,130,246,0.25)" }}
          animate={{ left: `${activeIndex * 20}%`, boxShadow: "0 14px 28px rgba(59,130,246,0.35)" }}
          transition={{ type: "spring", stiffness, damping }}
          transitionEnd={{ boxShadow: "0 8px 20px rgba(59,130,246,0.25)" }}
          className="absolute top-1 left-0 h-[calc(100%-0.5rem)] w-1/5 rounded-full bg-blue-500/20 border border-blue-500/30 pointer-events-none"
        />
        <div className="grid grid-cols-5 relative z-10">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const common = { animate: { scale: isActive ? 1.06 : 1, opacity: isActive ? 1 : 0.85 }, transition: { type: "spring", stiffness: 520, damping: 30 } }
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center py-3 text-xs ${isActive ? 'text-primary' : ''}`}>
                {item.kind === "logo" ? (
                  <motion.div {...common} className="relative size-5">
                    <Image src="/logo.svg" alt="AI" fill className="object-contain" />
                  </motion.div>
                ) : item.kind === "sun" ? (
                  <motion.span {...common}>
                    <SunIcon className="size-4" />
                  </motion.span>
                ) : item.kind === "settings" ? (
                  <motion.span {...common}>
                    <Cog6ToothIcon className="size-4" />
                  </motion.span>
                ) : item.kind === "sparkles" ? (
                  <motion.span {...common}>
                    <SparklesIcon className="size-4" />
                  </motion.span>
                ) : (
                  <motion.span {...common}>
                    <UserIcon className="size-4" />
                  </motion.span>
                )}
                <motion.span className="mt-1" animate={{ opacity: isActive ? 1 : 0.85 }} transition={{ duration: 0.2 }}>{item.label}</motion.span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
