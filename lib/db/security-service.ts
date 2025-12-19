import { getDB, initDB } from "./database"

export interface BannedIP {
  id: number
  ip: string
  reason: string | null
  banned_by: string | null
  expires_at: number | null
  created_at: number
}

export async function getBannedIPs(): Promise<BannedIP[]> {
  await initDB()
  const db = getDB()
  return db.prepare("SELECT * FROM banned_ips ORDER BY created_at DESC").all() as BannedIP[]
}

export async function addBannedIP(ip: string, reason?: string, bannedBy?: string, expiresAt?: number): Promise<void> {
  await initDB()
  const db = getDB()
  const now = Date.now()
  
  db.prepare(`
    INSERT INTO banned_ips (ip, reason, banned_by, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(ip, reason || null, bannedBy || 'system', expiresAt || null, now)
}

export async function removeBannedIP(ip: string): Promise<void> {
  await initDB()
  const db = getDB()
  db.prepare("DELETE FROM banned_ips WHERE ip = ?").run(ip)
}

export async function isIPBanned(ip: string): Promise<boolean> {
  const details = await getBanDetails(ip)
  return !!details
}

export async function getBanDetails(ip: string): Promise<BannedIP | null> {
  await initDB()
  const db = getDB()
  const now = Date.now()
  
  // Clean up expired bans first (lazy cleanup)
  db.prepare("DELETE FROM banned_ips WHERE expires_at IS NOT NULL AND expires_at < ?").run(now)
  
  return db.prepare("SELECT * FROM banned_ips WHERE ip = ?").get(ip) as BannedIP | null
}

export interface AccessLog {
  id: number
  ip: string
  method: string
  path: string
  status: number
  duration: number
  user_id?: number
  user_agent?: string
  created_at: number
}

export async function recordAccessLog(data: Omit<AccessLog, 'id' | 'created_at'>): Promise<void> {
  // Fire and forget, don't block
  try {
    await initDB()
    const db = getDB()
    const now = Date.now()
    
    db.prepare(`
      INSERT INTO access_logs (ip, method, path, status, duration, user_id, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.ip, 
      data.method, 
      data.path, 
      data.status, 
      data.duration, 
      data.user_id || null, 
      data.user_agent || null, 
      now
    )
  } catch (e) {
    console.error("Failed to record access log:", e)
  }
}

export async function getAccessLogs(limit: number = 100): Promise<AccessLog[]> {
  await initDB()
  const db = getDB()
  return db.prepare("SELECT * FROM access_logs ORDER BY created_at DESC LIMIT ?").all(limit) as AccessLog[]
}
