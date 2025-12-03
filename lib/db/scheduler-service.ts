import { getDB } from "./database"

export interface ScheduledTask {
  id: number
  title: string
  cron_expression?: string | null
  execute_at?: number | null
  action_type: 'relay' | 'led'
  device_id?: number
  params: string // JSON string
  is_active: number // 1 or 0
  created_at: number
  updated_at: number
}

export interface CreateTaskDTO {
  title: string
  cron_expression?: string
  execute_at?: number
  action_type: 'relay' | 'led'
  device_id?: number
  params: any
}

export function createTask(data: CreateTaskDTO): ScheduledTask {
  const db = getDB()
  const now = Date.now()
  
  const stmt = db.prepare(`
    INSERT INTO scheduled_tasks (
      title, cron_expression, execute_at, action_type, device_id, params, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `)
  
  const info = stmt.run(
    data.title,
    data.cron_expression || null,
    data.execute_at || null,
    data.action_type,
    data.device_id || null,
    JSON.stringify(data.params),
    now,
    now
  )
  
  return getTaskById(info.lastInsertRowid as number)!
}

export function getTaskById(id: number): ScheduledTask | undefined {
  const db = getDB()
  return db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id) as ScheduledTask | undefined
}

export function getAllTasks(): ScheduledTask[] {
  const db = getDB()
  return db.prepare("SELECT * FROM scheduled_tasks ORDER BY created_at DESC").all() as ScheduledTask[]
}

export function getActiveTasks(): ScheduledTask[] {
  const db = getDB()
  return db.prepare("SELECT * FROM scheduled_tasks WHERE is_active = 1").all() as ScheduledTask[]
}

export function deleteTask(id: number): void {
  const db = getDB()
  db.prepare("DELETE FROM scheduled_tasks WHERE id = ?").run(id)
}

export function updateTaskStatus(id: number, isActive: boolean): void {
  const db = getDB()
  db.prepare("UPDATE scheduled_tasks SET is_active = ?, updated_at = ? WHERE id = ?")
    .run(isActive ? 1 : 0, Date.now(), id)
}
