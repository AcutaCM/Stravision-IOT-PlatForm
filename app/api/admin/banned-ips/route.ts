import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getBannedIPs, addBannedIP, removeBannedIP } from "@/lib/db/security-service"
import { z } from "zod"

const banIpSchema = z.object({
  ip: z.string().ip({ message: "无效的 IP 地址" }),
  reason: z.string().optional(),
})

export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const ips = await getBannedIPs()
    return NextResponse.json(ips)
  } catch (error) {
    console.error("Failed to fetch banned IPs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const result = banIpSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { ip, reason } = result.data
    await addBannedIP(ip, reason, currentUser.username)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
       return NextResponse.json({ error: "该 IP 已在封禁列表中" }, { status: 409 })
    }
    console.error("Failed to ban IP:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const ip = searchParams.get('ip')
    
    if (!ip) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    await removeBannedIP(ip)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to unban IP:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
