import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <MobileBottomNav />
    </>
  )
}
