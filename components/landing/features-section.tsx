"use client"

import { motion } from "framer-motion"

const features = [
  {
    label: "Insights",
    title: "Analytics",
    description: "Track user behavior",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
    hasDots: true,
    glow: "border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
  },
  {
    label: "Overview",
    title: "Dashboard",
    description: "Centralized data view",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    label: "Teamwork",
    title: "Collaboration",
    description: "Work together seamlessly",
    className: "col-span-1 md:col-span-2 lg:col-span-2",
  },
  {
    label: "Efficiency",
    title: "Automation",
    description: "Streamline workflows",
    className: "col-span-1 md:col-span-2 lg:col-span-2",
  },
  {
    label: "Connectivity",
    title: "Integration",
    description: "Connect favorite tools",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    label: "Protection",
    title: "Security",
    description: "Enterprise-grade protection",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
  },
]

const Dots = () => {
  const dots = Array.from({ length: 15 }).map((_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 2,
    duration: Math.random() * 2 + 2,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute bg-purple-500 rounded-full opacity-40"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 max-w-7xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          核心技术优势
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          融合最前沿的物联网与人工智能技术，为现代农业赋能
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[240px]">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`
              relative group overflow-hidden rounded-3xl p-6 
              border transition-all duration-300
              flex flex-col justify-between
              ${feature.glow ? feature.glow : 'border-white/10 hover:border-white/20'}
              bg-black/20 backdrop-blur-sm
              ${feature.className}
            `}
          >
            {feature.hasDots && <Dots />}
            
            <div className="relative z-10">
              <span className="text-sm font-medium text-gray-500 tracking-wide">
                {feature.label}
              </span>
            </div>

            <div className="relative z-10 mt-auto">
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {feature.description}
              </p>
            </div>

            {/* Hover Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
