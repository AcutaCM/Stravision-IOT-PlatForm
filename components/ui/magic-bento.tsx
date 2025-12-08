"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MagicBentoProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  spotlightColor?: string;
  spotlightRadius?: number;
}

export function MagicBentoCard({
  className,
  title,
  icon,
  description,
  enableStars = false,
  enableSpotlight = true,
  spotlightColor = "rgba(120, 119, 198, 0.3)",
  spotlightRadius = 350,
  children,
  ...props
}: MagicBentoProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/10 bg-gray-900/40 p-8 hover:border-white/20 transition-colors",
        className
      )}
      onMouseMove={onMouseMove}
      {...props}
    >
      {/* Spotlight Effect - Disabled on mobile */}
      {enableSpotlight && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 hidden md:block"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                ${spotlightRadius}px circle at ${mouseX}px ${mouseY}px,
                ${spotlightColor},
                transparent 80%
              )
            `,
          }}
        />
      )}

      {/* Stars Effect */}
      {enableStars && <Stars />}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="space-y-2">
          {icon && <div className="mb-4 text-gray-400">{icon}</div>}
          <h3 className="text-xl font-bold text-gray-100">{title}</h3>
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

const Stars = () => {
  const randomMove = () => Math.random() * 2 - 1; // Random value between -1 and 1

  // Create fixed array of stars to prevent hydration mismatch
  const stars = useRef(
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2
    }))
  ).current;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute h-0.5 w-0.5 rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
