if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('Database module cannot run in Edge runtime')
}

import Database from "better-sqlite3"
import path from "path"
import { promises as fs } from "fs"

let db: Database.Database | null = null

/**
 * 获取数据库文件路径
 */
function getDatabasePath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "users.db")
}

/**
 * 初始化数据库连接和表结构
 */
export async function initDB(): Promise<void> {
  if (db) {
    return // 已经初始化
  }

  const dbPath = getDatabasePath()
  const dbDir = path.dirname(dbPath)

  // 确保数据目录存在
  try {
    await fs.mkdir(dbDir, { recursive: true })
  } catch (error) {
    console.error("Failed to create database directory:", error)
    throw error
  }

  // 创建数据库连接
  try {
    db = new Database(dbPath)

    // 启用外键约束
    db.pragma("foreign_keys = ON")

    // 优化 WAL 模式
    db.pragma('journal_mode = WAL')

    // 增加 busy timeout，减少 SQLITE_BUSY 错误
    db.pragma('busy_timeout = 5000')

  } catch (error) {
    console.error("Failed to open database:", error)
    throw error
  }

  // 创建 users 表（新库会包含微信字段，旧库需要后续迁移）
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      username TEXT NOT NULL,
      avatar_url TEXT,
      wechat_openid TEXT UNIQUE,
      wechat_unionid TEXT,
      wework_userid TEXT,
      qq_openid TEXT UNIQUE,
      alipay_user_id TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // 创建 scheduled_tasks 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cron_expression TEXT,
      execute_at INTEGER,
      action_type TEXT NOT NULL,
      device_id INTEGER,
      params TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // 创建 device_logs 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_name TEXT NOT NULL,
      action TEXT NOT NULL,
      operator TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    )
  `)

  // 旧库迁移：检测并补充缺失列
  try {
    const columns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>
    const names = new Set(columns.map((c) => c.name))

    if (!names.has("wechat_openid")) {
      db.exec(`ALTER TABLE users ADD COLUMN wechat_openid TEXT`)
    }
    if (!names.has("wechat_unionid")) {
      db.exec(`ALTER TABLE users ADD COLUMN wechat_unionid TEXT`)
    }
    if (!names.has("wework_userid")) {
      db.exec(`ALTER TABLE users ADD COLUMN wework_userid TEXT`)
    }
    if (!names.has("qq_openid")) {
      db.exec(`ALTER TABLE users ADD COLUMN qq_openid TEXT`)
    }
    if (!names.has("alipay_user_id")) {
      db.exec(`ALTER TABLE users ADD COLUMN alipay_user_id TEXT`)
    }
  } catch (e) {
    console.error("Failed to migrate users table columns:", e)
    throw e
  }

  // 创建索引以加速查询
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);
  `)

  console.log("Database initialized successfully at:", dbPath)

  // 执行数据迁移
  await migrateFromJSON()
}

/**
 * 获取数据库实例(单例模式)
 */
export function getDB(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDB() first.")
  }
  return db
}

/**
 * 关闭数据库连接
 */
export async function closeDB(): Promise<void> {
  if (db) {
    db.close()
    db = null
    console.log("Database connection closed")
  }
}

/**
 * 从 JSON 文件迁移用户数据到数据库
 */
async function migrateFromJSON(): Promise<void> {
  const jsonPath = path.join(process.cwd(), "data", "users.json")

  try {
    // 检查 JSON 文件是否存在
    await fs.access(jsonPath)
  } catch {
    // 文件不存在,无需迁移
    return
  }

  try {
    console.log("Found users.json, starting migration...")

    // 读取 JSON 文件
    const jsonContent = await fs.readFile(jsonPath, "utf-8")
    const users = JSON.parse(jsonContent) as Array<{
      email: string
      hash: string
      createdAt?: number
    }>

    if (!users || users.length === 0) {
      console.log("No users to migrate")
      await fs.rename(jsonPath, jsonPath + ".migrated")
      return
    }

    const database = getDB()
    const now = Date.now()

    // 使用事务批量插入
    const insert = database.prepare(`
      INSERT OR IGNORE INTO users (email, password_hash, username, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const migrateMany = database.transaction((usersToMigrate: typeof users) => {
      for (const user of usersToMigrate) {
        // 从邮箱生成默认用户名(邮箱@前面的部分)
        const username = user.email.split("@")[0]
        const createdAt = user.createdAt || now

        insert.run(user.email, user.hash, username, createdAt, now)
      }
    })

    migrateMany(users)

    console.log(`Successfully migrated ${users.length} users from JSON to database`)

    // 重命名 JSON 文件以标记已迁移
    await fs.rename(jsonPath, jsonPath + ".migrated")
    console.log("Renamed users.json to users.json.migrated")
  } catch (error) {
    console.error("Error during migration:", error)
    // 不抛出错误,允许应用继续运行
  }
}
