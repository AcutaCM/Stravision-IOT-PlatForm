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
  await initDB()
  const db = getDB()
  const now = Date.now()
  
  // Clean up expired bans first (lazy cleanup)
  db.prepare("DELETE FROM banned_ips WHERE expires_at IS NOT NULL AND expires_at < ?").run(now)
  
  const result = db.prepare("SELECT 1 FROM banned_ips WHERE ip = ?").get(ip)
  return !!result
}
