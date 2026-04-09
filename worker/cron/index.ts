import { cleanupOrphanedSessions } from './cleanup-sessions'

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

    default:
      console.warn(`Unknown cron schedule: ${controller.cron}`)
  }
}
