/**
 * Cleanup Orphaned Sessions
 *
 * Closes sessions that were started but never properly ended (e.g., user closed browser without calling /api/sessions/:id/end).
 * Sessions with ended_at IS NULL and older than 4 hours are automatically closed.
 */

export async function cleanupOrphanedSessions(env: Env): Promise<{ closedCount: number }> {
  // Calculate 4 hours ago timestamp
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

  try {
    // SELECT id, set_id, created_at, duration_seconds WHERE ended_at IS NULL AND created_at < fourHoursAgo
    const orphanedSessions = await env.DB.prepare(
      'SELECT id, set_id, created_at, duration_seconds FROM listening_sessions WHERE ended_at IS NULL AND created_at < ?'
    )
      .bind(fourHoursAgo)
      .all<{
        id: string
        set_id: string
        created_at: string
        duration_seconds: number
      }>()

    // If no results, return early
    if (!orphanedSessions.results || orphanedSessions.results.length === 0) {
      return { closedCount: 0 }
    }

    // Process each orphaned session
    let closedCount = 0

    for (const session of orphanedSessions.results) {
      // Get set duration for percentage calculation
      const setResult = await env.DB.prepare(
        'SELECT duration_seconds FROM sets WHERE id = ?'
      )
        .bind(session.set_id)
        .all<{ duration_seconds: number }>()

      // Skip session if set not found (set was deleted)
      if (!setResult.results || setResult.results.length === 0) {
        console.warn(`Skipping orphaned session ${session.id}: set ${session.set_id} not found`)
        continue
      }

      const set = setResult.results[0]

      // Calculate percentage_completed
      const percentageCompleted = (session.duration_seconds / set.duration_seconds) * 100

      // Calculate qualifies: >= 15% completion
      const qualifies = percentageCompleted >= 15 ? 1 : 0

      // Calculate ended_at: created_at + duration_seconds (best estimate)
      const createdAtTime = new Date(session.created_at).getTime()
      const endedAtTime = createdAtTime + session.duration_seconds * 1000
      const endedAt = new Date(endedAtTime).toISOString()

      // UPDATE listening_sessions SET ended_at, percentage_completed, qualifies WHERE id = session.id
      await env.DB.prepare(
        'UPDATE listening_sessions SET ended_at = ?, percentage_completed = ?, qualifies = ? WHERE id = ?'
      )
        .bind(endedAt, percentageCompleted, qualifies, session.id)
        .run()

      closedCount++
    }

    return { closedCount }
  } catch (error) {
    console.error('Cleanup orphaned sessions failed:', error)
    throw error
  }
}
