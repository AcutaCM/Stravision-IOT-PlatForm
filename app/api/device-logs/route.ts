import { NextRequest, NextResponse } from "next/server"
import { getDB, initDB } from "@/lib/db/database"

export async function GET(req: NextRequest) {
  try {
    await initDB()
    const db = getDB()
    
    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    
    const logs = db.prepare(`
      SELECT * FROM device_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit)
    
    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error("Failed to fetch device logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const db = getDB()
    
    const body = await req.json()
    const { device_name, action, operator, details } = body
    
    if (!device_name || !action || !operator) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    const stmt = db.prepare(`
      INSERT INTO device_logs (device_name, action, operator, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(device_name, action, operator, details || "", Date.now())
    
    return NextResponse.json({ success: true, id: result.lastInsertRowid })
  } catch (error) {
    console.error("Failed to create device log:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create log" },
      { status: 500 }
    )
  }
}
