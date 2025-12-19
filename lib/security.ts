import { NextRequest } from "next/server"
import { isIPBanned } from "@/lib/db/security-service"

export async function checkIPBan(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown-ip"
  // If multiple IPs, take the first one
  const clientIp = ip.split(',')[0].trim()
  
  try {
    const banned = await isIPBanned(clientIp)
    if (banned) {
      return { banned: true, ip: clientIp }
    }
  } catch (e) {
    console.error("Failed to check IP ban status:", e)
  }
  
  return { banned: false, ip: clientIp }
}
