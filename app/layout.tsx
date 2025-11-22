import type { Metadata } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/contexts/weather-context";

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
        <WeatherProvider>
          {children}
        </WeatherProvider>
      </body>
    </html>
  );
}
