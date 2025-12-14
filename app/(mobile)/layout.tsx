import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MobileOnboardingGuide } from "@/components/mobile-onboarding-guide"

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <MobileBottomNav />
      <MobileOnboardingGuide />
    </>
  )
}
