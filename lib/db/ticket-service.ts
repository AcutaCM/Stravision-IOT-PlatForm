import { getDB } from "./database"

export interface LoginTicket {
  ticket: string
  jwt?: string
  created_at: number
}

// 清理过期 ticket (10分钟)
function cleanupTickets() {
  const db = getDB()
  const expireTime = Date.now() - 10 * 60 * 1000
  db.prepare("DELETE FROM login_tickets WHERE created_at < ?").run(expireTime)
}

export async function createTicket(ticket: string): Promise<void> {
  const db = getDB()
  cleanupTickets()
  db.prepare("INSERT INTO login_tickets (ticket, created_at) VALUES (?, ?)").run(ticket, Date.now())
}

export async function updateTicketWithJwt(ticket: string, jwt: string): Promise<void> {
  const db = getDB()
  db.prepare("UPDATE login_tickets SET jwt = ? WHERE ticket = ?").run(jwt, ticket)
}

export async function getTicket(ticket: string): Promise<LoginTicket | undefined> {
  const db = getDB()
  return db.prepare("SELECT * FROM login_tickets WHERE ticket = ?").get(ticket) as LoginTicket | undefined
}

export async function deleteTicket(ticket: string): Promise<void> {
  const db = getDB()
  db.prepare("DELETE FROM login_tickets WHERE ticket = ?").run(ticket)
}
