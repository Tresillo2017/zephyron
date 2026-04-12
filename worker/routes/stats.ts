import { json } from '../lib/router'
import {
  calculateTopArtists,
  calculateTopGenre,
  calculateDiscoveries,
  calculateStreak,
  calculateHeatmap,
  calculateWeekdayPattern
} from '../lib/stats'
import type {
  ProfileStats,
  GetStatsResponse,
  GetStatsError
} from '../types'

/**
 * GET /api/profile/:userId/stats?period=all|year|month
 * Returns comprehensive listening statistics for a user
 */
export async function getStats(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const userId = params.userId

  // Validate user ID format (nanoid: 12-char alphanumeric with _ or -)
  if (!userId || !/^[a-zA-Z0-9_-]{12}$/.test(userId)) {
    return json<GetStatsError>({
      error: 'INVALID_USER_ID',
      message: 'User ID format invalid'
    }, 400)
  }

  try {
    // Check if user exists and profile is public
    const user = await env.DB.prepare(
      'SELECT id, is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { id: string; is_profile_public: number } | null

    if (!user) {
      return json<GetStatsError>({
        error: 'USER_NOT_FOUND',
        message: 'User does not exist'
      }, 404)
    }

    if (user.is_profile_public !== 1) {
      return json<GetStatsError>({
        error: 'PROFILE_PRIVATE',
        message: 'Profile is private'
      }, 403)
    }

    // Parse period parameter (default: all time)
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'all'

    // Calculate date range based on period
    const now = new Date()
    let startDate: string
    let endDate: string

    if (period === 'year') {
      startDate = `${now.getFullYear()}-01-01`
      endDate = `${now.getFullYear() + 1}-01-01`
    } else if (period === 'month') {
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      startDate = `${year}-${month}-01`
      const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
      const nextYear = now.getMonth() === 11 ? year + 1 : year
      endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    } else {
      // all time
      startDate = '2000-01-01'
      endDate = '2100-01-01'
    }

    // Query unique session dates for streak calculation
    const sessionDates = await env.DB.prepare(`
      SELECT DISTINCT session_date
      FROM listening_sessions
      WHERE user_id = ?
        AND session_date >= ?
        AND session_date < ?
      ORDER BY session_date ASC
    `).bind(userId, startDate, endDate).all()

    // Calculate all stats in parallel
    const [
      topArtists,
      topGenre,
      discoveries,
      heatmap,
      weekdayPattern,
      basicStats
    ] = await Promise.all([
      calculateTopArtists(env, userId, startDate, endDate, 5),
      calculateTopGenre(env, userId, startDate, endDate),
      calculateDiscoveries(env, userId, startDate, endDate),
      calculateHeatmap(env, userId, startDate, endDate),
      calculateWeekdayPattern(env, userId, startDate, endDate),
      // Basic stats query
      env.DB.prepare(`
        SELECT
          CAST(SUM(duration_seconds) / 3600.0 AS REAL) as total_hours,
          COUNT(*) as total_sessions,
          CAST(AVG(duration_seconds) / 60.0 AS REAL) as average_session_minutes,
          CAST(MAX(duration_seconds) / 60.0 AS REAL) as longest_session_minutes
        FROM listening_sessions
        WHERE user_id = ?
          AND session_date >= ?
          AND session_date < ?
      `).bind(userId, startDate, endDate).first() as any
    ])

    // Calculate streak from session dates
    const streak = calculateStreak(
      (sessionDates.results as Array<{ session_date: string }>).map(row => row.session_date)
    )

    // Build stats object
    const stats: ProfileStats = {
      total_hours: Math.round((basicStats?.total_hours || 0) * 10) / 10,
      total_sessions: basicStats?.total_sessions || 0,
      average_session_minutes: Math.round((basicStats?.average_session_minutes || 0) * 10) / 10,
      longest_session_minutes: Math.round((basicStats?.longest_session_minutes || 0) * 10) / 10,
      top_artists: topArtists.map(artist => ({
        artist,
        hours: 0 // TODO: Calculate hours per artist
      })),
      top_genres: topGenre ? [{ genre: topGenre, count: 1 }] : [],
      discoveries_count: discoveries,
      longest_streak_days: streak,
      listening_heatmap: heatmap,
      weekday_pattern: weekdayPattern
    }

    return json<GetStatsResponse>({ stats })

  } catch (error) {
    console.error('Stats calculation error:', error)
    return json<GetStatsError>({
      error: 'STATS_UNAVAILABLE',
      message: 'Unable to calculate stats'
    }, 500)
  }
}
