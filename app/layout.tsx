import type { Metadata } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/contexts/weather-context";
import { ThemeProvider } from "@/components/theme-provider";
import { SchedulerInit } from "@/components/scheduler-init";
import { Toaster } from "sonner";
import { PageTransition } from "@/components/page-transition";
import { OnboardingGuide } from "@/components/onboarding-guide";

export const metadata: Metadata = {
  title: "stravision莓界 · 登录",
  description: "stravision莓界登录页面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SchedulerInit />
          <WeatherProvider>
            <PageTransition>
              {children}
            </PageTransition>
            <OnboardingGuide />
            <Toaster />
          </WeatherProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
