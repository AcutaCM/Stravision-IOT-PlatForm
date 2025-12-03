import cron from "node-cron"
import { getActiveTasks, deleteTask, ScheduledTask } from "@/lib/db/scheduler-service"
import { MQTTService } from "@/lib/mqtt-service"
import { getValidatedMQTTConfig } from "@/lib/mqtt-config"

// In-memory storage for running jobs
const jobs: Map<number, cron.ScheduledTask | NodeJS.Timeout> = new Map()

export class SchedulerRunner {
  private static instance: SchedulerRunner
  private isInitialized = false

  private constructor() {}

  public static getInstance(): SchedulerRunner {
    if (!SchedulerRunner.instance) {
      SchedulerRunner.instance = new SchedulerRunner()
    }
    return SchedulerRunner.instance
  }

  public async init() {
    if (this.isInitialized) return
    this.isInitialized = true
    console.log("[Scheduler] Initializing...")
    
    await this.refreshTasks()
    
    console.log("[Scheduler] Started")
  }

  public async refreshTasks() {
    // Stop all existing jobs
    this.stopAll()

    // Fetch active tasks
    const tasks = getActiveTasks()
    console.log(`[Scheduler] Loaded ${tasks.length} active tasks`)

    const mqtt = MQTTService.getInstance()
    
    // Ensure MQTT is connected
    if (!mqtt.isConnected()) {
       console.log("[Scheduler] Connecting to MQTT...")
       try {
         await mqtt.connect()
       } catch (e) {
         console.error("[Scheduler] Failed to connect to MQTT during init, but continuing to schedule tasks:", e)
       }
    }

    for (const task of tasks) {
      this.scheduleTask(task)
    }
  }

  private stopAll() {
    for (const [id, job] of jobs.entries()) {
      if ('stop' in job) {
        job.stop() // Cron job
      } else {
        clearTimeout(job) // Timeout
      }
    }
    jobs.clear()
  }

  private scheduleTask(task: ScheduledTask) {
    if (task.cron_expression) {
      // Cron Task
      if (!cron.validate(task.cron_expression)) {
        console.error(`[Scheduler] Invalid cron expression for task ${task.id}: ${task.cron_expression}`)
        return
      }

      const job = cron.schedule(task.cron_expression, () => {
        this.executeTask(task)
      })
      jobs.set(task.id, job)
      console.log(`[Scheduler] Scheduled cron task ${task.id}: ${task.title} (${task.cron_expression})`)

    } else if (task.execute_at) {
      // One-time Task
      const now = Date.now()
      const delay = task.execute_at - now

      if (delay <= 0) {
        console.log(`[Scheduler] Task ${task.id} is in the past, executing immediately if within reasonable window (e.g. 1 min)`)
        if (delay > -60000) {
           this.executeTask(task)
        } else {
           // Mark as expired? Or just delete?
           deleteTask(task.id)
        }
        return
      }

      const timeout = setTimeout(() => {
        this.executeTask(task)
        // Cleanup after run
        deleteTask(task.id)
        jobs.delete(task.id)
      }, delay)
      
      jobs.set(task.id, timeout)
      console.log(`[Scheduler] Scheduled one-time task ${task.id}: ${task.title} in ${Math.round(delay/1000)}s`)
    }
  }

  private async executeTask(task: ScheduledTask) {
    console.log(`[Scheduler] Executing task ${task.id}: ${task.title}`)
    const mqtt = MQTTService.getInstance()
    
    try {
      // Ensure MQTT is connected
      if (!mqtt.isConnected()) {
         console.log("[Scheduler] MQTT not connected, attempting to connect...")
         await mqtt.connect()
      }

      let params: any
      try {
        params = typeof task.params === 'string' ? JSON.parse(task.params) : task.params
      } catch (e) {
        console.error(`[Scheduler] Failed to parse params for task ${task.id}:`, task.params)
        return
      }
      
      console.log(`[Scheduler] Task params:`, params)
      
      let command: any = {}
      
      if (task.action_type === 'relay') {
        if (params.value === undefined) throw new Error("Missing 'value' in relay task params")
        command = {
          type: 'relay',
          relayNum: task.device_id,
          newState: params.value
        }
      } else if (task.action_type === 'led') {
        command = {
          type: 'led',
          led1: params.r || 0,
          led2: params.g || 0,
          led3: params.b || 0,
          led4: params.w || 0
        }
      }

      console.log(`[Scheduler] Sending command:`, command)
      await mqtt.sendControlCommand(command)
      console.log(`[Scheduler] Task ${task.id} executed successfully`)
      
    } catch (e) {
      console.error(`[Scheduler] Failed to execute task ${task.id}:`, e)
    }
  }
}
