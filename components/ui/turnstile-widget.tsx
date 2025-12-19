"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export default function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  useEffect(() => {
    // If turnstile is already loaded and we have the container
    if (window.turnstile && containerRef.current && !widgetId) {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "", 
        callback: (token) => onVerify(token),
        "error-callback": onError,
        "expired-callback": onExpire,
        theme,
      });
      setWidgetId(id);
    }

    // Define the callback for when the script loads
    window.onloadTurnstileCallback = () => {
      if (containerRef.current && !widgetId) {
        const id = window.turnstile?.render(containerRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
          callback: (token) => onVerify(token),
          "error-callback": onError,
          "expired-callback": onExpire,
          theme,
        }) || null;
        setWidgetId(id);
      }
    };

    return () => {
      // Cleanup if needed (Turnstile usually handles this, but good practice)
      if (widgetId && window.turnstile) {
        // window.turnstile.remove(widgetId); // API might differ, reset is common
      }
      window.onloadTurnstileCallback = undefined;
    };
  }, [onVerify, onError, onExpire, theme, widgetId]);

  return (
    <div className="w-full flex justify-center my-4">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback"
        strategy="lazyOnload"
      />
      <div ref={containerRef} />
    </div>
  );
}
