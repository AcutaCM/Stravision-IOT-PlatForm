"use client"

import { motion } from "framer-motion"

export function FluidOrb() {
  return (
    <div className="relative w-64 h-64 mx-auto my-8">
      {/* Core Gradient Orb */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 opacity-80 blur-xl"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 90, 0],
          filter: ["blur(40px)", "blur(60px)", "blur(40px)"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Inner Metallic/Glassy Sphere */}
      <motion.div
        className="absolute inset-4 rounded-full bg-gradient-to-tr from-white/40 via-white/10 to-transparent backdrop-blur-md border border-white/20 shadow-[inset_0_0_40px_rgba(255,255,255,0.5)]"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Iridescent Highlights */}
        <div className="absolute top-4 left-8 w-16 h-8 rounded-full bg-white/60 blur-md rotate-[-45deg]" />
        <div className="absolute bottom-8 right-8 w-24 h-24 rounded-full bg-gradient-to-br from-blue-300/30 to-purple-300/30 blur-xl" />
      </motion.div>

      {/* Outer Glow Ring */}
      <motion.div
        className="absolute inset-[-10%] rounded-full border-2 border-white/10"
        animate={{
          rotate: [360, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  )
}
