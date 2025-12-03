export const runtime = 'nodejs'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }
  console.log('Starting scheduler instrumentation...')
  const { initDB } = await import("@/lib/db/database")
  const { SchedulerRunner } = await import("@/lib/scheduler/runner")
  await initDB()
  await SchedulerRunner.getInstance().init()
}
