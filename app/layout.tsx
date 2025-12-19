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
import { headers } from "next/headers";
import { isIPBanned, recordAccessLog } from "@/lib/db/security-service";

export const metadata: Metadata = {
  title: "stravision莓界 · 登录",
  description: "stravision莓界登录页面",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // IP Ban Check
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  
  if (await isIPBanned(ip)) {
     // Record access attempt
     await recordAccessLog({
       ip,
       method: "GET",
       path: "layout",
       status: 403,
       duration: 0,
       user_agent: headersList.get("user-agent") || ""
     });
     
     return (
       <html lang="en">
         <body>
           <div style={{ 
             display: 'flex', 
             justifyContent: 'center', 
             alignItems: 'center', 
             height: '100vh', 
             flexDirection: 'column',
             fontFamily: 'system-ui, sans-serif'
           }}>
             <h1 style={{ color: '#e11d48' }}>Access Denied</h1>
             <p>Your IP address ({ip}) has been banned from accessing this system.</p>
           </div>
         </body>
       </html>
     );
  }

  // Record normal access (optional, but requested "record every visiting ip")
  // To avoid slowing down page loads, we fire and forget, but in Server Components 
  // we can't easily fire-and-forget without `void`.
  // Also, doing this on every layout render might be heavy.
  // We'll record it.
  recordAccessLog({
    ip,
    method: "GET",
    path: "PAGE_VIEW", // Not easy to get full path in layout
    status: 200,
    duration: 0,
    user_agent: headersList.get("user-agent") || ""
  }).catch(console.error);

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
