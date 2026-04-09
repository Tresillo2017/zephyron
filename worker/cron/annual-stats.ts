/**
 * Annual Stats Aggregation
 *
 * Runs on January 2 at 5am PT to generate annual stats for all users from the previous year.
 * Calculates top 5 artists, genres, discoveries, and longest consecutive listening streak.
 * Generates Wrapped images for each user and stores R2 keys.
 * Uses UPSERT to handle re-runs without duplicating data.
 */

import {
  calculateTopArtists,
  calculateTopGenre,
  calculateDiscoveries,
  calculateStreak,
} from '../lib/stats'
import { generateWrappedImage } from '../lib/canvas-wrapped'

export async function generateAnnualStats(
  env: Env,
  year: number
): Promise<{ processedUsers: number; imagesGenerated: number }> {
  try {
    // Calculate date range for the full year
    const startDate = `${year}-01-01`
    const endDate = `${year + 1}-01-01`

    console.log(`Generating annual stats for ${startDate} to ${endDate}`)

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
      return { processedUsers: 0, imagesGenerated: 0 }
    }

    console.log(`Found ${usersResult.results.length} users to process`)

    let processedUsers = 0
    let imagesGenerated = 0

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

        // Get top 5 artists (annual uses top 5 vs monthly's top 3)
        const topArtists = await calculateTopArtists(env, userId, startDate, endDate, 5)

        // Get top genre
        const topGenre = await calculateTopGenre(env, userId, startDate, endDate)

        // Get discovery count
        const discoveries = await calculateDiscoveries(env, userId, startDate, endDate)

        // Get qualifying session dates and calculate streak
        const qualifyingDatesResult = await env.DB.prepare(
          `SELECT DISTINCT session_date FROM listening_sessions
           WHERE user_id = ?
             AND session_date >= ?
             AND session_date < ?
             AND qualifies = 1
           ORDER BY session_date`
        )
          .bind(userId, startDate, endDate)
          .all<{ session_date: string }>()

        const sessionDates = (qualifyingDatesResult.results || []).map((r) => r.session_date)
        const longestStreak = calculateStreak(sessionDates)

        // UPSERT into user_annual_stats
        // If record exists for (user_id, year), update it; otherwise insert
        await env.DB.prepare(
          `INSERT INTO user_annual_stats
             (user_id, year, total_seconds, qualifying_sessions, unique_sets_count, top_artists, top_genre, longest_streak_days, discoveries_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, year) DO UPDATE SET
             total_seconds = excluded.total_seconds,
             qualifying_sessions = excluded.qualifying_sessions,
             unique_sets_count = excluded.unique_sets_count,
             top_artists = excluded.top_artists,
             top_genre = excluded.top_genre,
             longest_streak_days = excluded.longest_streak_days,
             discoveries_count = excluded.discoveries_count`
        )
          .bind(
            userId,
            year,
            totalDuration,
            qualifyingSessions,
            uniqueSets,
            JSON.stringify(topArtists),
            topGenre,
            longestStreak,
            discoveries
          )
          .run()

        // Generate Wrapped image with error handling
        try {
          const wrappedResult = await generateWrappedImage(
            userId,
            {
              year,
              total_seconds: totalDuration,
              top_artists: JSON.stringify(topArtists),
              top_genre: topGenre,
              longest_streak_days: longestStreak,
              discoveries_count: discoveries,
            },
            env
          )

          // UPSERT wrapped image R2 key
          await env.DB.prepare(
            `INSERT INTO wrapped_images
               (user_id, year, r2_key)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id, year) DO UPDATE SET
               r2_key = excluded.r2_key`
          )
            .bind(userId, year, wrappedResult.r2_key)
            .run()

          imagesGenerated++
          console.log(`Generated Wrapped image for ${userId}: ${wrappedResult.r2_key}`)
        } catch (imageError) {
          console.error(`Failed to generate Wrapped image for ${userId}:`, imageError)
          // Continue with next user instead of failing the whole job
        }

        processedUsers++
        console.log(
          `Processed user ${userId}: ${totalDuration}s, ${qualifyingSessions} qualifying sessions, ${longestStreak} day streak`
        )
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error)
        // Continue with next user instead of failing the whole job
      }
    }

    console.log(
      `Annual stats generation completed: ${processedUsers} users processed, ${imagesGenerated} images generated`
    )
    return { processedUsers, imagesGenerated }
  } catch (error) {
    console.error('Annual stats generation failed:', error)
    throw error
  }
}
