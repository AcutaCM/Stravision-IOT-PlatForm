export const runtime = 'nodejs'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }
  console.log('Starting scheduler instrumentation...')
  const { initDB } = await import("@/lib/db/database")
  const { SchedulerRunner } = await import("@/lib/scheduler/runner")
  const { initSensorDataIfNeeded, cleanupOldSensorData } = await import("@/lib/db/device-service")
  const { startDataCollector } = await import("@/lib/services/data-collector")
  const cron = (await import("node-cron")).default

  await initDB()
  
  // Initialize scheduler
  await SchedulerRunner.getInstance().init()
  
  // Initialize sensor data system
  await initSensorDataIfNeeded()
  
  // Schedule daily cleanup at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[System] Running daily data cleanup...')
    await cleanupOldSensorData()
  })

  // startDataCollector() // Disabled to allow real data from MQTT
}
