"use client"

import { Toaster } from "sonner"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export function ToasterWrapper() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if current path indicates a mobile page (ending with -ios)
    // OR if the viewport is mobile width
    const isMobilePath = pathname?.includes('-ios')
    const isMobileWidth = window.innerWidth < 768

    setIsMobile(!!(isMobilePath || isMobileWidth))

    // Optional: Add resize listener if we want to be responsive to window resizing
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || (pathname?.includes('-ios') ?? false))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pathname])

  return (
    <Toaster 
      position={isMobile ? "top-center" : "bottom-right"} 
      richColors
      closeButton
    />
  )
}
