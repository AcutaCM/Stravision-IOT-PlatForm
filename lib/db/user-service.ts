import bcrypt from "bcryptjs"
import { getDB, initDB } from "./database"

// 确保数据库已初始化的 Promise
let dbInitPromise: Promise<void> | null = null

/**
 * 确保数据库已初始化
 */
async function ensureDB() {
  if (!dbInitPromise) {
    dbInitPromise = initDB()
  }
  await dbInitPromise
}

/**
 * 完整的用户数据模型(包含敏感字段)
 */
export interface User {
  id: number
  email: string
  password_hash: string
  username: string
  avatar_url: string | null
  wechat_openid?: string | null
  wechat_unionid?: string | null
  created_at: number
  updated_at: number
}

/**
 * 公开的用户信息(移除敏感字段)
 */
export interface UserPublic {
  id: number
  email: string
  username: string
  avatar_url: string | null
  created_at: number
}

/**
 * 创建用户的输入参数
 */
export interface CreateUserInput {
  email: string
  password: string
  username: string
}

/**
 * 更新用户的输入参数
 */
export interface UpdateUserInput {
  username?: string
  avatar_url?: string | null
}

/**
 * 将完整用户对象转换为公开用户信息
 * 移除敏感字段如 password_hash 和 updated_at
 */
export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
  }
}

/**
 * 创建新用户
 * @param input 用户创建输入参数
 * @returns 创建的用户公开信息
 * @throws 如果邮箱已存在或数据库操作失败
 */
export async function createUser(input: CreateUserInput): Promise<UserPublic> {
  await ensureDB()
  const db = getDB()
  const now = Date.now()

  // 检查邮箱是否已存在
  const existingUser = await getUserByEmail(input.email)
  if (existingUser) {
    throw new Error("该邮箱已被注册")
  }

  // 哈希密码
  const password_hash = await bcrypt.hash(input.password, 10)

  // 插入新用户
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, username, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  try {
    const result = stmt.run(input.email, password_hash, input.username, now, now)
    const userId = result.lastInsertRowid as number

    // 获取创建的用户
    const user = await getUserById(userId)
    if (!user) {
      throw new Error("创建用户后无法获取用户信息")
    }

    return toPublicUser(user)
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("该邮箱已被注册")
    }
    throw error
  }
}

/**
 * 通过邮箱查询用户
 * @param email 用户邮箱
 * @returns 用户对象或 null
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureDB()
  const db = getDB()
  const stmt = db.prepare(`
    SELECT * FROM users WHERE email = ?
  `)

  const user = stmt.get(email) as User | undefined
  return user || null
}

/**
 * 通过ID查询用户
 * @param id 用户ID
 * @returns 用户对象或 null
 */
export async function getUserById(id: number): Promise<User | null> {
  await ensureDB()
  const db = getDB()
  const stmt = db.prepare(`
    SELECT * FROM users WHERE id = ?
  `)

  const user = stmt.get(id) as User | undefined
  return user || null
}

export async function getUserByWeChatOpenId(openid: string): Promise<User | null> {
  await ensureDB()
  const db = getDB()
  const stmt = db.prepare(`
    SELECT * FROM users WHERE wechat_openid = ?
  `)
  const user = stmt.get(openid) as User | undefined
  return user || null
}

export async function getUserByWeChatUnionId(unionid: string): Promise<User | null> {
  await ensureDB()
  const db = getDB()
  const stmt = db.prepare(`
    SELECT * FROM users WHERE wechat_unionid = ?
  `)
  const user = stmt.get(unionid) as User | undefined
  return user || null
}

/**
 * 更新用户信息
 * @param id 用户ID
 * @param input 更新输入参数
 * @returns 更新后的用户公开信息
 * @throws 如果用户不存在或数据库操作失败
 */
export async function updateUser(id: number, input: UpdateUserInput): Promise<UserPublic> {
  await ensureDB()
  const db = getDB()
  const now = Date.now()

  // 检查用户是否存在
  const existingUser = await getUserById(id)
  if (!existingUser) {
    throw new Error("用户不存在")
  }

  // 构建更新语句
  const updates: string[] = []
  const values: (string | number | null)[] = []

  if (input.username !== undefined) {
    updates.push("username = ?")
    values.push(input.username)
  }

  if (input.avatar_url !== undefined) {
    updates.push("avatar_url = ?")
    values.push(input.avatar_url)
  }

  if (updates.length === 0) {
    // 没有需要更新的字段,直接返回当前用户
    return toPublicUser(existingUser)
  }

  // 添加 updated_at
  updates.push("updated_at = ?")
  values.push(now)

  // 添加 WHERE 条件的 id
  values.push(id)

  const stmt = db.prepare(`
    UPDATE users SET ${updates.join(", ")} WHERE id = ?
  `)

  stmt.run(...values)

  // 获取更新后的用户
  const updatedUser = await getUserById(id)
  if (!updatedUser) {
    throw new Error("更新用户后无法获取用户信息")
  }

  return toPublicUser(updatedUser)
}

/**
 * 验证用户凭证(邮箱和密码)
 * @param email 用户邮箱
 * @param password 用户密码(明文)
 * @returns 验证成功返回用户公开信息,失败返回 null
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<UserPublic | null> {
  await ensureDB()
  // 通过邮箱查询用户
  const user = await getUserByEmail(email)
  if (!user) {
    return null
  }

  // 验证密码
  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    return null
  }

  // 返回公开用户信息
  return toPublicUser(user)
}

export async function findOrCreateWeChatUser(params: {
  openid: string
  unionid?: string
  nickname?: string
  avatar?: string | null
}): Promise<UserPublic> {
  await ensureDB()
  const db = getDB()
  const now = Date.now()

  let existingUser: User | null = null
  if (params.unionid) {
    existingUser = await getUserByWeChatUnionId(params.unionid)
  }
  if (!existingUser) {
    existingUser = await getUserByWeChatOpenId(params.openid)
  }

  if (existingUser) {
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (params.nickname && params.nickname !== existingUser.username) {
      updates.push("username = ?")
      values.push(params.nickname)
    }
    if (params.avatar !== undefined && params.avatar !== existingUser.avatar_url) {
      updates.push("avatar_url = ?")
      values.push(params.avatar)
    }

    updates.push("updated_at = ?")
    values.push(now)
    values.push(existingUser.id)

    if (updates.length > 1) {
      const stmt = db.prepare(`
        UPDATE users SET ${updates.join(", ")} WHERE id = ?
      `)
      stmt.run(...values)
    }

    const updated = await getUserById(existingUser.id)
    if (!updated) {
      throw new Error("更新微信用户后无法获取用户信息")
    }
    return toPublicUser(updated)
  }

  const email = `wechat_${(params.unionid || params.openid)}@wx.local`
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, username, avatar_url, wechat_openid, wechat_unionid, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    email,
    "",
    params.nickname || "微信用户",
    params.avatar || null,
    params.openid,
    params.unionid || null,
    now,
    now
  )

  const newId = result.lastInsertRowid as number
  const created = await getUserById(newId)
  if (!created) {
    throw new Error("创建微信用户后无法获取用户信息")
  }
  return toPublicUser(created)
}
