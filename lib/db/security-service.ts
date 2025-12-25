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

export interface LoginLog {
  id: number
  user_id: number
  ip: string
  country: string | null
  region: string | null
  city: string | null
  user_agent: string | null
  device_type: string | null
  created_at: number
}

export async function fetchIpLocation(ip: string): Promise<{ country: string, region: string, city: string } | null> {
  // 跳过本地 IP
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null
  }

  try {
    // 使用 ip-api.com (免费版，非商业用途，有限流)
    // 实际生产环境建议使用付费服务或本地库
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2秒超时

    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success') {
        return {
          country: data.country,
          region: data.regionName,
          city: data.city
        }
      }
    }
  } catch (e) {
    // 忽略错误，不阻塞登录
    console.warn(`Failed to fetch location for IP ${ip}:`, e)
  }
  return null
}

export async function recordLoginLog(userId: number, ip: string, userAgent: string, preFetchedLocation?: { country: string, region: string, city: string } | null): Promise<LoginLog> {
  await initDB()
  const db = getDB()
  const now = Date.now()

  // 尝试获取地理位置（如果未预先获取）
  const location = preFetchedLocation !== undefined ? preFetchedLocation : await fetchIpLocation(ip)

  const result = db.prepare(`
    INSERT INTO login_logs (user_id, ip, country, region, city, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    ip,
    location?.country || null,
    location?.region || null,
    location?.city || null,
    userAgent,
    now
  )

  return {
    id: Number(result.lastInsertRowid),
    user_id: userId,
    ip,
    country: location?.country || null,
    region: location?.region || null,
    city: location?.city || null,
    user_agent: userAgent,
    device_type: null, // 可以后续解析 UA
    created_at: now
  }
}

export async function getLastLogin(userId: number): Promise<LoginLog | undefined> {
  await initDB()
  const db = getDB()
  return db.prepare("SELECT * FROM login_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId) as LoginLog | undefined
}

export async function checkSuspiciousLogin(userId: number, currentIp: string, currentRegion: string | null): Promise<{ isSuspicious: boolean, lastRegion: string | null }> {
  // 获取上一次登录记录（排除本次，因为本次可能还没存或者刚存）
  // 这里我们需要在 recordLoginLog 之前调用，或者查询 offset 1
  
  // 策略：查询最近的 5 次登录，看是否有相同的 IP 或 地区
  await initDB()
  const db = getDB()
  const logs = db.prepare("SELECT * FROM login_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(userId) as LoginLog[]
  
  if (logs.length === 0) {
    return { isSuspicious: false, lastRegion: null } // 首次登录
  }

  // 如果最近有相同 IP，则不认为异地
  if (logs.some(log => log.ip === currentIp)) {
    return { isSuspicious: false, lastRegion: logs[0].region }
  }

  // 如果 IP 不同，检查地区
  // 假设 currentRegion 已知（通过 fetchIpLocation）
  // 如果 currentRegion 未知，只能基于 IP 字符串判断（不太准），或者保守地只提示“新 IP”
  
  if (!currentRegion) {
    // 只有 IP 不同，且没有地区信息，标记为 New IP
    return { isSuspicious: true, lastRegion: logs[0].region }
  }

  // 检查最近几次登录是否有相同地区
  const hasSameRegion = logs.some(log => log.region === currentRegion)
  
  if (hasSameRegion) {
    return { isSuspicious: false, lastRegion: logs[0].region }
  }

  return { isSuspicious: true, lastRegion: logs[0].region }
}
