import { getDB, initDB } from "./database"
import { UserPublic, toPublicUser, User } from "./user-service"

let dbInitPromise: Promise<void> | null = null

async function ensureDB() {
  if (!dbInitPromise) {
    dbInitPromise = initDB()
  }
  await dbInitPromise
}

export interface FriendRequest {
  id: number
  requester_id: number
  addressee_id: number
  status: 'pending' | 'accepted' | 'rejected'
  created_at: number
  requester?: UserPublic
  addressee?: UserPublic
}

export interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  type: 'text' | 'image' | 'file'
  file_url?: string
  read_at?: number
  created_at: number
}

export interface Group {
  id: number
  name: string
  owner_id: number
  avatar_url?: string
  created_at: number
}

export interface GroupMember {
  group_id: number
  user_id: number
  role: 'owner' | 'admin' | 'member'
  is_muted: boolean // 0 or 1 in DB
  joined_at: number
  user?: UserPublic
}

export class ChatService {
  // ... existing methods ...

  /**
   * Block or Unblock a user
   */
  static async toggleBlockUser(userId: number, friendId: number, block: boolean): Promise<{ success: boolean; message: string }> {
    await ensureDB()
    const db = getDB()

    if (block) {
      // Check if target is an admin
      const friend = db.prepare("SELECT role FROM users WHERE id = ?").get(friendId) as { role: string } | undefined
      if (friend && (friend.role === 'admin' || friend.role === 'super_admin')) {
        return { success: false, message: 'Cannot block an administrator' }
      }
    }

    try {
      db.prepare("UPDATE friends SET is_blocked = ? WHERE user_id = ? AND friend_id = ?")
        .run(block ? 1 : 0, userId, friendId)
      return { success: true, message: block ? 'User blocked' : 'User unblocked' }
    } catch (error) {
      console.error("Failed to toggle block:", error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Check if blocked
   */
  static async isBlocked(userId: number, friendId: number): Promise<boolean> {
    await ensureDB()
    const db = getDB()
    const result = db.prepare("SELECT is_blocked FROM friends WHERE user_id = ? AND friend_id = ?").get(userId, friendId) as { is_blocked: number } | undefined
    return result ? !!result.is_blocked : false
  }

  /**
   * Create a group
   */
  static async createGroup(ownerId: number, name: string, initialMemberIds: number[] = []): Promise<{ success: boolean; groupId?: number; message: string }> {
    await ensureDB()
    const db = getDB()

    const transaction = db.transaction(() => {
      const result = db.prepare("INSERT INTO groups (name, owner_id, created_at) VALUES (?, ?, ?)").run(name, ownerId, Date.now())
      const groupId = result.lastInsertRowid as number

      // Add owner
      db.prepare("INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)").run(groupId, ownerId, Date.now())

      // Add members
      const stmt = db.prepare("INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      for (const memberId of initialMemberIds) {
        if (memberId !== ownerId) {
           stmt.run(groupId, memberId, Date.now())
        }
      }
      return groupId
    })

    try {
      const groupId = transaction()
      return { success: true, groupId, message: 'Group created' }
    } catch (error) {
      console.error("Failed to create group:", error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Get user groups
   */
  static async getUserGroups(userId: number): Promise<Group[]> {
    await ensureDB()
    const db = getDB()
    return db.prepare(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `).all(userId) as Group[]
  }

  /**
   * Get group members
   */
  static async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    await ensureDB()
    const db = getDB()
    
    const members = db.prepare(`
      SELECT gm.*, u.id as u_id, u.email as u_email, u.username as u_username, u.avatar_url as u_avatar_url, u.role as u_role
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `).all(groupId) as any[]

    return members.map(m => ({
      group_id: m.group_id,
      user_id: m.user_id,
      role: m.role,
      is_muted: !!m.is_muted,
      joined_at: m.joined_at,
      user: {
        id: m.u_id,
        email: m.u_email,
        username: m.u_username,
        avatar_url: m.u_avatar_url,
        role: m.u_role || 'user',
        permissions: {},
        notification_settings: { alerts: false, status: false, ai: false, updates: false },
        created_at: 0
      }
    }))
  }

  /**
   * Send message (updated for group support)
   */
  static async sendMessage(senderId: number, receiverId: number | null, content: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string, groupId?: number): Promise<{ success: boolean; message?: Message; error?: string }> {
    await ensureDB()
    const db = getDB()

    // Check block status for 1-on-1
    if (!groupId && receiverId) {
      const isBlockedByReceiver = await this.isBlocked(receiverId, senderId)
      if (isBlockedByReceiver) {
        return { success: false, error: 'You are blocked by this user' }
      }
    }

    // Check mute status for Group
    if (groupId) {
       const member = db.prepare("SELECT is_muted FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, senderId) as { is_muted: number } | undefined
       if (!member) return { success: false, error: 'Not a member' }
       if (member.is_muted) return { success: false, error: 'You are muted in this group' }
    }

    try {
      const result = db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, group_id, content, type, file_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(senderId, receiverId || null, groupId || null, content, type, fileUrl, Date.now())

      return {
        success: true,
        message: {
          id: result.lastInsertRowid as number,
          sender_id: senderId,
          receiver_id: receiverId || 0,
          content,
          type,
          file_url: fileUrl,
          created_at: Date.now()
        }
      }
    } catch (e) {
      return { success: false, error: 'Failed to send' }
    }
  }

  /**
   * Get messages (updated for group support)
   */
  static async getMessages(userId: number, targetId: number, isGroup: boolean = false, limit = 50, offset = 0): Promise<Message[]> {
    await ensureDB()
    const db = getDB()

    let messages;
    if (isGroup) {
      messages = db.prepare(`
        SELECT * FROM messages
        WHERE group_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(targetId, limit, offset) as Message[]
    } else {
      messages = db.prepare(`
        SELECT * FROM messages
        WHERE group_id IS NULL AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, targetId, targetId, userId, limit, offset) as Message[]
    }

    return messages.reverse()
  }

  /**
   * Toggle mute member in group
   */
  static async toggleGroupMute(groupId: number, adminId: number, targetUserId: number, mute: boolean): Promise<{ success: boolean; message: string }> {
    await ensureDB()
    const db = getDB()

    // Check if operator is System Admin
    const operatorUser = db.prepare("SELECT role FROM users WHERE id = ?").get(adminId) as { role: string } | undefined
    const isSystemAdmin = operatorUser && (operatorUser.role === 'admin' || operatorUser.role === 'super_admin')

    // Check group admin rights
    const admin = db.prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, adminId) as { role: string } | undefined
    const isGroupAdmin = admin && (admin.role === 'owner' || admin.role === 'admin')

    if (!isSystemAdmin && !isGroupAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    // Check if target is System Admin (cannot be muted)
    if (mute) {
        const targetUser = db.prepare("SELECT role FROM users WHERE id = ?").get(targetUserId) as { role: string } | undefined
        if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
             return { success: false, message: 'Cannot mute an administrator' }
        }
    }

    db.prepare("UPDATE group_members SET is_muted = ? WHERE group_id = ? AND user_id = ?").run(mute ? 1 : 0, groupId, targetUserId)
    return { success: true, message: mute ? 'User muted' : 'User unmuted' }
  }

  /**
   * Add member to group
   */
  static async addGroupMember(groupId: number, adminId: number, targetUserId: number): Promise<{ success: boolean; message: string }> {
      await ensureDB()
      const db = getDB()

      // Check admin rights (optional: currently allow any member to add? No, let's restrict to admin/owner for safety, or allow all)
      // Usually inviting is allowed by everyone, but adding directly might need permission.
      // Let's allow any member to invite for now to keep it simple, OR strictly owner.
      // Let's check if inviter is in group.
      const inviter = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, adminId)
      if (!inviter) return { success: false, message: 'Not a member' }

      try {
          db.prepare("INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)").run(groupId, targetUserId, Date.now())
          return { success: true, message: 'Member added' }
      } catch (e) {
          return { success: false, message: 'Failed to add member' }
      }
  }
}
  static async sendFriendRequest(requesterId: number, addresseeEmail: string): Promise<{ success: boolean; message: string }> {
    await ensureDB()
    const db = getDB()

    // Find addressee
    const addressee = db.prepare('SELECT * FROM users WHERE email = ?').get(addresseeEmail) as User | undefined
    if (!addressee) {
      return { success: false, message: 'User not found' }
    }

    if (addressee.id === requesterId) {
      return { success: false, message: 'Cannot add yourself as friend' }
    }

    // Check if already friends
    const existingFriend = db.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?').get(requesterId, addressee.id)
    if (existingFriend) {
      return { success: false, message: 'Already friends' }
    }

    // Check if request already exists
    const existingRequest = db.prepare('SELECT * FROM friend_requests WHERE requester_id = ? AND addressee_id = ? AND status = ?')
      .get(requesterId, addressee.id, 'pending')
    
    if (existingRequest) {
      return { success: false, message: 'Friend request already sent' }
    }
    
    // Check if they sent one to us
    const reverseRequest = db.prepare('SELECT * FROM friend_requests WHERE requester_id = ? AND addressee_id = ? AND status = ?')
      .get(addressee.id, requesterId, 'pending') as FriendRequest | undefined

    if (reverseRequest) {
        // Auto accept if they already asked
        return this.acceptFriendRequest(reverseRequest.id, requesterId)
    }

    try {
      db.prepare(`
        INSERT INTO friend_requests (requester_id, addressee_id, status, created_at, updated_at)
        VALUES (?, ?, 'pending', ?, ?)
      `).run(requesterId, addressee.id, Date.now(), Date.now())
      return { success: true, message: 'Friend request sent' }
    } catch (error) {
      console.error('Failed to send friend request:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Get pending friend requests for a user
   */
  static async getFriendRequests(userId: number): Promise<FriendRequest[]> {
    await ensureDB()
    const db = getDB()
    
    const requests = db.prepare(`
      SELECT fr.*, 
             u.id as u_id, u.email as u_email, u.username as u_username, u.avatar_url as u_avatar_url
      FROM friend_requests fr
      JOIN users u ON fr.requester_id = u.id
      WHERE fr.addressee_id = ? AND fr.status = 'pending'
    `).all(userId) as any[]

    return requests.map(r => ({
      id: r.id,
      requester_id: r.requester_id,
      addressee_id: r.addressee_id,
      status: r.status,
      created_at: r.created_at,
      requester: {
        id: r.u_id,
        email: r.u_email,
        username: r.u_username,
        avatar_url: r.u_avatar_url,
        role: 'user', // Simplified
        permissions: {},
        notification_settings: {
            alerts: false,
            status: false,
            ai: false,
            updates: false
        },
        created_at: 0
      }
    }))
  }

  /**
   * Accept friend request
   */
  static async acceptFriendRequest(requestId: number, userId: number): Promise<{ success: boolean; message: string }> {
    await ensureDB()
    const db = getDB()

    const request = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(requestId) as FriendRequest | undefined
    if (!request) {
      return { success: false, message: 'Request not found' }
    }

    if (request.addressee_id !== userId) {
      return { success: false, message: 'Unauthorized' }
    }

    const transaction = db.transaction(() => {
      // Update request status
      db.prepare("UPDATE friend_requests SET status = 'accepted', updated_at = ? WHERE id = ?").run(Date.now(), requestId)

      // Add to friends table (bidirectional)
      db.prepare("INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)").run(request.requester_id, request.addressee_id, Date.now())
      db.prepare("INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)").run(request.addressee_id, request.requester_id, Date.now())
    })

    try {
      transaction()
      return { success: true, message: 'Friend request accepted' }
    } catch (error) {
      console.error('Failed to accept friend request:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Reject friend request
   */
  static async rejectFriendRequest(requestId: number, userId: number): Promise<{ success: boolean; message: string }> {
    await ensureDB()
    const db = getDB()
    
    const request = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(requestId) as FriendRequest | undefined
    if (!request) {
        return { success: false, message: 'Request not found' }
    }

    if (request.addressee_id !== userId) {
        return { success: false, message: 'Unauthorized' }
    }

    try {
        db.prepare("UPDATE friend_requests SET status = 'rejected', updated_at = ? WHERE id = ?").run(Date.now(), requestId)
        return { success: true, message: 'Friend request rejected' }
    } catch (error) {
        return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Get friends list
   */
  static async getFriends(userId: number): Promise<UserPublic[]> {
    await ensureDB()
    const db = getDB()

    const friends = db.prepare(`
      SELECT u.*
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
    `).all(userId) as User[]

    return friends.map(toPublicUser)
  }

  /**
   * Send message
   */
  static async sendMessage(senderId: number, receiverId: number, content: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string): Promise<Message> {
    await ensureDB()
    const db = getDB()

    const result = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content, type, file_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(senderId, receiverId, content, type, fileUrl, Date.now())

    return {
      id: result.lastInsertRowid as number,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      type,
      file_url: fileUrl,
      created_at: Date.now()
    }
  }

  /**
   * Get messages between two users
   */
  static async getMessages(userId: number, friendId: number, limit = 50, offset = 0): Promise<Message[]> {
    await ensureDB()
    const db = getDB()

    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, friendId, friendId, userId, limit, offset) as Message[]

    return messages.reverse() // Return oldest to newest
  }
}
