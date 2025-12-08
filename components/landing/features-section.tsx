"use client"

import { motion } from "framer-motion"
import { MagicBentoCard } from "@/components/ui/magic-bento"
import { CloudLightning, Activity, Eye, Shield, Cpu } from "lucide-react"
import Image from "next/image"

const features = [
  {
    icon: (
      <div className="relative w-8 h-8 rounded-lg overflow-hidden">
        <Image
          src="/logo.svg"
          alt="AI Logo"
          fill
          className="object-cover grayscale brightness-200"
        />
      </div>
    ),
    title: "AI 智眼诊断",
    description: "集成多模态视觉大模型，实时分析作物生长阶段，精准识别病害与环境胁迫，提供科学的种植决策建议",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
    enableStars: true,
    spotlightColor: "rgba(168, 85, 247, 0.2)"
  },
  {
    icon: <Activity className="w-6 h-6 text-white" />,
    title: "全维环境感知",
    description: "多传感器融合，实时捕捉微环境变化",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
    spotlightColor: "rgba(59, 130, 246, 0.2)"
  },
  {
    icon: <CloudLightning className="w-6 h-6 text-white" />,
    title: "智能协同调控",
    description: "基于作物生长模型的自动化设备协同控制，实现精准补光与灌溉",
    className: "col-span-1 md:col-span-2 lg:col-span-2",
    spotlightColor: "rgba(251, 191, 36, 0.2)"
  },
  {
    icon: <Eye className="w-6 h-6 text-white" />,
    title: "视觉生长监测",
    description: "全天候视觉监控与时序分析，记录作物生长的每一个精彩瞬间",
    className: "col-span-1 md:col-span-2 lg:col-span-2",
    spotlightColor: "rgba(52, 211, 153, 0.2)"
  },
  {
    icon: <Cpu className="w-6 h-6 text-white" />,
    title: "边缘计算架构",
    description: "本地化数据处理，断网亦可稳定运行",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
    spotlightColor: "rgba(34, 211, 238, 0.2)"
  },
  {
    icon: <Shield className="w-6 h-6 text-white" />,
    title: "企业级安全",
    description: "端到端加密传输，保障农业核心数据安全",
    className: "col-span-1 md:col-span-1 lg:col-span-1",
    spotlightColor: "rgba(251, 113, 133, 0.2)"
  },
]

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
          <MagicBentoCard
            key={i}
            className={feature.className}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            enableStars={feature.enableStars}
            spotlightColor={feature.spotlightColor}
          />
        ))}
      </div>
    </section>
  )
}
