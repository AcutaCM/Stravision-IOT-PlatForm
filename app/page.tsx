"use client"

import Link from "next/link"
import { ArrowRight, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#02040a] text-white overflow-hidden selection:bg-blue-500/30">
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

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 text-center max-w-5xl mx-auto mt-[-40px]">
        
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/20 backdrop-blur-sm">
            AI 驱动的智慧农业解决方案
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8"
        >
          <span className="block text-gray-300">智慧感知.</span>
          <span className="block text-gray-200">万物互联.</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            面向未来
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-base sm:text-lg md:text-xl text-gray-400 mb-12 leading-relaxed px-4"
        >
          Stravision 是您的一站式精准农业物联网平台。
          利用人工智能的力量，实时监测、分析并精准调控您的温室环境。
        </motion.p>

        {/* CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col w-full sm:w-auto sm:flex-row items-center gap-4 px-4 sm:px-0"
        >
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto group h-14 px-8 rounded-full bg-white text-black hover:bg-gray-200 transition-all text-base font-semibold"
            >
              进入控制台
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/monitor" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto group h-14 px-8 rounded-full border-gray-700 bg-transparent text-white hover:bg-white/5 hover:border-gray-500 transition-all text-base"
            >
              实时监控
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </main>

      {/* Footer / Bottom Glow Overlay */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#02040a] to-transparent z-20 pointer-events-none" />
    </div>
  )
}
