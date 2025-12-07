"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

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
          <Link href="#about" className="hover:text-white transition-colors">About</Link>
          <Link href="#technologies" className="hover:text-white transition-colors">Technologies</Link>
          <Link href="#products" className="hover:text-white transition-colors">Products</Link>
          <Link href="#discover" className="hover:text-white transition-colors">Discover</Link>
        </div>

        <div className="flex items-center gap-2">
           <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
             Stravision
           </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <div className="flex items-center gap-6 text-gray-400">
            <Link href="#team" className="hover:text-white transition-colors">Team</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#buy" className="hover:text-white transition-colors">Buy Premium</Link>
          </div>
          <Link href="/login">
            <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-6 font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
        
        {/* Mobile Menu Button - Simplified for now */}
        <div className="md:hidden">
          <Link href="/login">
            <Button size="sm" className="bg-white text-black hover:bg-gray-200 rounded-full">
              Start
            </Button>
          </Link>
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
            AI Powered IoT Solution
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8"
        >
          <span className="block text-gray-300">Smart.</span>
          <span className="block text-gray-200">Connected.</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Future-Ready
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-lg md:text-xl text-gray-400 mb-12 leading-relaxed"
        >
          Stravision is your one-stop IoT platform for precision agriculture. 
          Monitor, analyze, and control your greenhouse environment with the power of AI.
        </motion.p>

        {/* CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link href="/dashboard">
            <Button 
              size="lg" 
              variant="outline" 
              className="group h-14 px-8 rounded-full border-gray-700 bg-transparent text-white hover:bg-white/5 hover:border-gray-500 transition-all text-base"
            >
              Get a demo
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
