/**
 * Monthly Stats Aggregation
 *
 * Runs on the 1st of each month at 5am PT to generate monthly stats for all users.
 * Calculates top artists, genres, discoveries, and longest sets for the previous month.
 * Uses UPSERT to handle re-runs without duplicating data.
 */

import {
  calculateTopArtists,
  calculateTopGenre,
  calculateDiscoveries,
  calculateLongestSet,
} from '../lib/stats'

export async function generateMonthlyStats(
  env: Env,
  year: number,
  month: number
): Promise<{ processedUsers: number }> {
  try {
    // Calculate date range for the previous month
    // If month is 1 (January), previous month is 12 (December) of previous year
    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear = year - 1
    }

    // Format dates as YYYY-MM-DD
    const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-01`

    console.log(`Generating monthly stats for ${startDate} to ${endDate}`)

    // Get all distinct users with sessions in this period
    const usersResult = await env.DB.prepare(
      `SELECT DISTINCT user_id FROM listening_sessions
       WHERE session_date >= ? AND session_date < ?
       ORDER BY user_id`
    )
      .bind(startDate, endDate)
      .all<{ user_id: string }>()

    if (!usersResult.results || usersResult.results.length === 0) {
      console.log('No users found with sessions in this period')
      return { processedUsers: 0 }
    }

    console.log(`Found ${usersResult.results.length} users to process`)

    let processedUsers = 0

    for (const userRow of usersResult.results) {
      const userId = userRow.user_id

      try {
        // Get base stats: total duration, qualifying sessions, unique sets
        const baseStatsResult = await env.DB.prepare(
          `SELECT
             SUM(duration_seconds) as total_duration,
             COUNT(*) FILTER (WHERE qualifies = 1) as qualifying_sessions,
             COUNT(DISTINCT set_id) as unique_sets
           FROM listening_sessions
           WHERE user_id = ?
             AND session_date >= ?
             AND session_date < ?`
        )
          .bind(userId, startDate, endDate)
          .first<{
            total_duration: number | null
            qualifying_sessions: number
            unique_sets: number
          }>()

        const totalDuration = baseStatsResult?.total_duration ?? 0
        const qualifyingSessions = baseStatsResult?.qualifying_sessions ?? 0
        const uniqueSets = baseStatsResult?.unique_sets ?? 0

        // Get top 3 artists
        const topArtists = await calculateTopArtists(env, userId, startDate, endDate, 3)

        // Get top genre
        const topGenre = await calculateTopGenre(env, userId, startDate, endDate)

        // Get discovery count
        const discoveries = await calculateDiscoveries(env, userId, startDate, endDate)

        // Get longest set
        const longestSetId = await calculateLongestSet(env, userId, startDate, endDate)

        // UPSERT into user_monthly_stats
        // If record exists for (user_id, year, month), update it; otherwise insert
        await env.DB.prepare(
          `INSERT INTO user_monthly_stats
             (user_id, year, month, total_duration_seconds, qualifying_sessions, unique_sets, top_artists, top_genre, new_artists_discovered, longest_set_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, year, month) DO UPDATE SET
             total_duration_seconds = excluded.total_duration_seconds,
             qualifying_sessions = excluded.qualifying_sessions,
             unique_sets = excluded.unique_sets,
             top_artists = excluded.top_artists,
             top_genre = excluded.top_genre,
             new_artists_discovered = excluded.new_artists_discovered,
             longest_set_id = excluded.longest_set_id`
        )
          .bind(
            userId,
            prevYear,
            prevMonth,
            totalDuration,
            qualifyingSessions,
            uniqueSets,
            JSON.stringify(topArtists),
            topGenre,
            discoveries,
            longestSetId
          )
          .run()

        processedUsers++
        console.log(`Processed user ${userId}: ${totalDuration}s, ${qualifyingSessions} qualifying sessions`)
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error)
        // Continue with next user instead of failing the whole job
      }
    }

    console.log(`Monthly stats generation completed: ${processedUsers} users processed`)
    return { processedUsers }
  } catch (error) {
    console.error('Monthly stats generation failed:', error)
    throw error
  }
}
