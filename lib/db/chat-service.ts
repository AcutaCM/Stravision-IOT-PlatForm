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

export class ChatService {
  /**
   * Send a friend request
   */
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
