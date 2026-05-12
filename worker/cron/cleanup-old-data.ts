/**
 * Data Retention Cleanup
 *
 * Runs monthly alongside stats aggregation. Prevents unbounded table growth in D1
 * (10GB limit). Keeps data that has user value; prunes what doesn't.
 *
 * Retention policy:
 *   - listen_history (anonymous): 90 days — anonymous users have no account to view history
 *   - activity_items: 180 days — feed entries older than 6 months have no practical value
 */

export async function cleanupOldData(
  env: Env
): Promise<{ anonymousHistoryDeleted: number; activityItemsDeleted: number }> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const [anonResult, activityResult] = await env.DB.batch([
    // Only delete anonymous rows — authenticated users keep their full history
    env.DB.prepare(
      'DELETE FROM listen_history WHERE user_id IS NULL AND last_listened_at < ?'
    ).bind(ninetyDaysAgo),
    env.DB.prepare(
      'DELETE FROM activity_items WHERE created_at < ?'
    ).bind(oneEightyDaysAgo),
  ])

  return {
    anonymousHistoryDeleted: anonResult.meta.changes ?? 0,
    activityItemsDeleted: activityResult.meta.changes ?? 0,
  }
}
