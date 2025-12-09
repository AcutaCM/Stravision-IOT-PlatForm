"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { HeroSection } from "@/components/landing/hero-section"
import { TechStackSection } from "@/components/landing/tech-stack-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { SmartControlSection } from "@/components/landing/smart-control-section"
import { AnytimeControlSection } from "@/components/landing/anytime-control-section"
import { AiChatSection } from "@/components/landing/ai-chat-section"
import { ProductShowcase } from "@/components/landing/product-showcase"
import { Footer } from "@/components/landing/footer"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef, useEffect, useState } from "react"

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [windowHeight, setWindowHeight] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight)
      setIsMobile(window.innerWidth < 768)
    }

    // Initial check
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const { scrollY } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  // Calculations for Mascot Animation
  // Stage 1: Hero (0 - 100vh) -> Stays centered but moves down slightly
  // Stage 2: Transition to Features (100vh - 150vh) -> Moves to side
  // Stage 3: Stay at Features (150vh - 200vh) -> Stays at side
  // Stage 4: Exit (> 200vh) -> Fades out

  // Note: These values are approximations based on typical section heights.
  // Hero is min-h-[90vh], Features is py-24 (approx 100vh total height with content)

  const vh = windowHeight || 1000 // Fallback

  const mascotX = useTransform(scrollY,
    [0, vh * 0.5, vh * 1.2],
    ["50%", "50%", "15%"] // Moves from center to left side
  )

  const mascotY = useTransform(scrollY,
    [0, vh * 0.5, vh * 1.2],
    ["25vh", "40vh", "115vh"] // Moves down to Features section title level
  )

  const mascotScale = useTransform(scrollY,
    [0, vh * 0.5, vh * 1.2],
    [1, 1.2, 0.6] // Scales up then down to fit as an icon
  )

  const mascotRotate = useTransform(scrollY,
    [0, vh * 1.2],
    [0, 360] // Full rotation
  )

  const mascotOpacity = useTransform(scrollY,
    [vh * 1.8, vh * 2.5],
    [1, 0] // Fades out after Features section
  )

  return (
    <div ref={containerRef} className="min-h-screen bg-[#02040a] text-white selection:bg-blue-500/30 relative">
      {/* Global Mascot - Hidden on mobile to improve performance */}
      {!isMobile && (
        <motion.div
          style={{
            position: "absolute",
            x: "-50%", // Center the element itself
            left: mascotX,
            top: mascotY,
            scale: mascotScale,
            rotate: mascotRotate,
            opacity: mascotOpacity,
            zIndex: 40,
            pointerEvents: "none"
          }}
          className="w-32 h-32 sm:w-40 sm:h-40 fixed" // fixed to viewport, but we control position manually via top/left which framer motion handles
        >
          <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full" />
          <Image
            src="/logo.gif"
            alt="Stravision Mascot"
            fill
            className="object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]"
            unoptimized
          />
        </motion.div>
      )}

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[20%] right-[20%] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <Link href="#about" className="hover:text-white transition-colors">关于我们</Link>
          <Link href="#technologies" className="hover:text-white transition-colors">核心技术</Link>
          <Link href="#products" className="hover:text-white transition-colors">产品中心</Link>
          <Link href="#discover" className="hover:text-white transition-colors">探索更多</Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Stravision 莓界
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <div className="flex items-center gap-6 text-gray-400">
            <Link href="#team" className="hover:text-white transition-colors">团队</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">价格</Link>
            <Link href="#buy" className="hover:text-white transition-colors">订阅服务</Link>
          </div>
          <Link href="/login">
            <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-6 font-semibold">
              立即开始
            </Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-[#02040a] border-gray-800 text-white p-6">
              <div className="flex flex-col gap-8 mt-8">
                <div className="flex flex-col gap-4 text-lg font-medium text-gray-400">
                  <Link href="#about" className="hover:text-white transition-colors">关于我们</Link>
                  <Link href="#technologies" className="hover:text-white transition-colors">核心技术</Link>
                  <Link href="#products" className="hover:text-white transition-colors">产品中心</Link>
                  <Link href="#discover" className="hover:text-white transition-colors">探索更多</Link>
                  <div className="h-px bg-gray-800 my-2" />
                  <Link href="#team" className="hover:text-white transition-colors">团队</Link>
                  <Link href="#pricing" className="hover:text-white transition-colors">价格</Link>
                  <Link href="#buy" className="hover:text-white transition-colors">订阅服务</Link>
                </div>
                <Link href="/login" className="w-full">
                  <Button className="w-full bg-white text-black hover:bg-gray-200 rounded-full font-semibold">
                    立即开始
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <main className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <SmartControlSection />
        <AiChatSection />
        <AnytimeControlSection />
        <ProductShowcase />
        <TechStackSection />
      </main>

      <Footer />
    </div>
  )
}
