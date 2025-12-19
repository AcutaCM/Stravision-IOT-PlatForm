import { NextRequest } from "next/server";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const trackers = new Map<string, { count: number; expiresAt: number }>();

/**
 * Basic in-memory rate limiter
 * Note: In a distributed environment (e.g. Vercel Serverless), this will only work per-instance.
 * For robust distributed rate limiting, use Redis (e.g. @upstash/ratelimit).
 */
export function rateLimit(req: NextRequest, config: RateLimitConfig = { limit: 10, windowMs: 60 * 1000 }) {
  const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
  const now = Date.now();
  
  // Cleanup expired entries periodically (lazy cleanup on request for simplicity)
  // Ideally this should be a separate interval but for simple use cases this is fine
  const record = trackers.get(ip);

  if (!record || now > record.expiresAt) {
    trackers.set(ip, { count: 1, expiresAt: now + config.windowMs });
    return { success: true };
  }

  if (record.count >= config.limit) {
    return { success: false };
  }

  record.count++;
  return { success: true };
}
