import { getDB, initDB } from "./database"

export interface RateLimitConfig {
  limit: number
  windowMs: number
  violationLimit: number // Before auto-ban
  banDuration: number // ms
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowMs: 60 * 1000,
  violationLimit: 5,
  banDuration: 24 * 60 * 60 * 1000
}

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  await initDB()
  const db = getDB()
  const row = db.prepare("SELECT value FROM system_settings WHERE key = ?").get("rate_limit_config") as { value: string } | undefined
  
  if (!row) return DEFAULT_RATE_LIMIT_CONFIG
  try {
    return JSON.parse(row.value)
  } catch (e) {
    return DEFAULT_RATE_LIMIT_CONFIG
  }
}

export async function updateRateLimitConfig(config: RateLimitConfig): Promise<void> {
  await initDB()
  const db = getDB()
  const now = Date.now()
  
  db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run("rate_limit_config", JSON.stringify(config), now)
}
