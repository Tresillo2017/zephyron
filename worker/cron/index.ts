import { cleanupOrphanedSessions } from './cleanup-sessions'
import { generateMonthlyStats } from './monthly-stats'

/**
 * Cloudflare Workers Cron Handler
 *
 * Dispatches scheduled events to appropriate handlers based on cron expression.
 * Registered crons are defined in wrangler.jsonc under triggers.crons[].
 */
export async function handleScheduled(
  controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  console.log(`Cron triggered: ${controller.cron}`)

  switch (controller.cron) {
    case '0 * * * *': // Hourly: session cleanup (top of every hour)
      try {
        const result = await cleanupOrphanedSessions(env)
        console.log(`Session cleanup completed: ${result.closedCount} sessions closed`)
      } catch (error) {
        console.error('Session cleanup failed:', error)
        controller.noRetry()
        throw error
      }
      break

    case '0 5 1 * *': // Monthly: stats aggregation (1st of month at 5am PT / 12pm UTC or 1pm UTC PDT)
      try {
        const now = new Date()
        // Get the previous month and year
        let month = now.getUTCMonth()
        let year = now.getUTCFullYear()

        // Month is 0-indexed, so December is 11, January is 0
        if (month === 0) {
          month = 12
          year -= 1
        } else {
          month = month
        }

        const result = await generateMonthlyStats(env, year, month)
        console.log(`Monthly stats aggregation completed: ${result.processedUsers} users processed`)
      } catch (error) {
        console.error('Monthly stats aggregation failed:', error)
        controller.noRetry()
        throw error
      }
      break

    default:
      console.warn(`Unknown cron schedule: ${controller.cron}`)
  }
}
