import type { Metadata } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/contexts/weather-context";
import { DeviceProvider } from "@/lib/contexts/device-context";
import { ThemeProvider } from "@/components/theme-provider";
import { SchedulerInit } from "@/components/scheduler-init";
import { PageTransition } from "@/components/page-transition";
import { SmoothScroll } from "@/components/smooth-scroll";
import { EnvironmentAlert } from "@/components/environment-alert";
import { ToasterWrapper } from "@/components/toaster-wrapper";

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
            <DeviceProvider>
            <EnvironmentAlert />
            <SmoothScroll>
              <PageTransition>
                  {children}
                </PageTransition>
                <ToasterWrapper />
              </SmoothScroll>
            </DeviceProvider>
          </WeatherProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
