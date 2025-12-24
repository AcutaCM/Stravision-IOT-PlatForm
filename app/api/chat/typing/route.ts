import { getCurrentUser } from "@/lib/auth"
import { getDB } from "@/lib/db/database"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { targetId, groupId } = await req.json()
    const db = getDB()

    // Ensure typing_status table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS typing_status (
        user_id INTEGER NOT NULL,
        target_id INTEGER,
        group_id INTEGER,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, target_id, group_id)
      )
    `)

    // Update typing status
    // We use INSERT OR REPLACE to update the timestamp
    db.prepare(`
      INSERT OR REPLACE INTO typing_status (user_id, target_id, group_id, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(user.id, targetId || 0, groupId || 0, Date.now())

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Typing status error:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function GET(req: Request) {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  
    const { searchParams } = new URL(req.url)
    const targetId = searchParams.get('targetId')
    const groupId = searchParams.get('groupId')

    const db = getDB()
    const now = Date.now()
    const THRESHOLD = 3000 // 3 seconds

    try {
        // Clean up old entries (optional, or run periodically)
        // db.prepare("DELETE FROM typing_status WHERE updated_at < ?").run(now - THRESHOLD)

        let isTyping = false
        
        if (groupId) {
            // Check if anyone else is typing in the group
            const res = db.prepare(`
                SELECT COUNT(*) as count FROM typing_status 
                WHERE group_id = ? AND user_id != ? AND updated_at > ?
            `).get(groupId, user.id, now - THRESHOLD) as { count: number }
            isTyping = res.count > 0
        } else if (targetId) {
            // Check if the specific friend is typing to us
            // target_id in DB is the receiver. So if Friend is typing to Me:
            // Friend's user_id = FriendID, Friend's target_id = MeID
            const res = db.prepare(`
                SELECT COUNT(*) as count FROM typing_status 
                WHERE user_id = ? AND target_id = ? AND updated_at > ?
            `).get(targetId, user.id, now - THRESHOLD) as { count: number }
            isTyping = res.count > 0
        }

        return NextResponse.json({ isTyping })

    } catch (error) {
        return NextResponse.json({ isTyping: false })
    }
}
