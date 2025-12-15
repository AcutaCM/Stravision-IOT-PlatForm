"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { useContext, useRef } from "react"

// Define the order of pages for transition direction
const pageOrder = [
    "/dashboard",
    "/monitor",
    "/device-control",
    "/ai-assistant"
]

function FrozenRouter(props: { children: React.ReactNode }) {
    const context = useContext(LayoutRouterContext ?? {})
    const frozen = useRef(context).current

    return (
        <LayoutRouterContext.Provider value={frozen}>
            {props.children}
        </LayoutRouterContext.Provider>
    )
}

import { DesktopOnboardingGuide } from "@/components/onboarding-guide"

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Find index of current page
    // If page is not in the list (e.g. login), default to -1 or handle as needed
    const getPageIndex = (path: string) => {
        const index = pageOrder.findIndex(p => path.startsWith(p))
        return index === -1 ? 0 : index
    }

    const isMobile = pathname.includes("-ios") || pathname === "/profile"
    
    // Disable transition wrapper for Landing Page ("/") to allow native scrolling
    if (isMobile || pathname === "/") {
        return (
            <>
                {children}
                {!isMobile && <DesktopOnboardingGuide />}
            </>
        )
    }

    const currentIndex = getPageIndex(pathname)
    // We need to store the previous index to determine direction
    // However, in a functional component, we can't easily get "previous" props without a ref or state
    // But AnimatePresence's custom prop allows us to pass data to variants
    // A simpler approach for "slide" is just to use the key.
    // To know direction, we might need a context or just rely on a simple assumption:
    // We can't easily know the "previous" path in a server component wrapper without more complex state.
    // BUT, for this specific request "AI Assistant -> Dashboard", AI is index 3, Dashboard is 0.
    // So we are going 3 -> 0 (decreasing).

    // Let's try a slightly different approach using a persistent tuple in a ref to track [prev, current]
    const indexRef = useRef<{ prev: number, current: number }>({ prev: currentIndex, current: currentIndex })

    if (indexRef.current.current !== currentIndex) {
        indexRef.current = { prev: indexRef.current.current, current: currentIndex }
    }

    const direction = indexRef.current.current > indexRef.current.prev ? 1 : -1

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? "100%" : "-100%",
            opacity: 0,
            zIndex: 1 // Ensure entering page is above or below? Usually above.
        }),
        center: {
            x: 0,
            opacity: 1,
            zIndex: 0
        },
        exit: (direction: number) => ({
            x: direction > 0 ? "-100%" : "100%",
            opacity: 0,
            zIndex: -1
        })
    }

    return (
        <div className="relative w-full h-screen overflow-hidden bg-gray-50 dark:bg-zinc-950">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                    key={pathname}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                    }}
                    className="w-full h-full"
                >
                    <FrozenRouter>{children}</FrozenRouter>
                </motion.div>
            </AnimatePresence>
            <DesktopOnboardingGuide />
        </div>
    )
}
