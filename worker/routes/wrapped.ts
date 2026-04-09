import { json, errorResponse } from '../lib/router'
import { requireAuth } from '../lib/auth'
import {
  calculateTopArtists,
  calculateTopGenre,
  calculateDiscoveries,
  calculateLongestSet,
} from '../lib/stats'

type AuthRouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string; role: string; name: string; email: string }
) => Promise<Response> | Response

/**
 * Wrapper to handle auth checks for routes
 */
function withAuth(handler: AuthRouteHandler) {
  return async (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    params: Record<string, string>
  ) => {
    const result = await requireAuth(request, env)
    if (result instanceof Response) return result
    return handler(request, env, ctx, params, result.user)
  }
}

/**
 * GET /api/wrapped/:year
 * Retrieve annual Wrapped data for a specific year
 */
async function getAnnualWrappedHandler(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const yearStr = params.year
  if (!yearStr) {
    return errorResponse('Year parameter required', 400)
  }

  // Validate year is a number
  const year = parseInt(yearStr, 10)
  if (isNaN(year)) {
    return errorResponse('Year must be a valid number', 400)
  }

  // Validate year is in valid range (2020 to current year)
  const currentYear = new Date().getFullYear()
  if (year < 2020 || year > currentYear) {
    return errorResponse(`Year must be between 2020 and ${currentYear}`, 400)
  }

  try {
    // Query user_annual_stats
    const stats = await env.DB.prepare(
      `SELECT year, total_seconds, top_artists, top_genre, discoveries_count, longest_streak_days, generated_at
       FROM user_annual_stats
       WHERE user_id = ? AND year = ?`
    )
      .bind(user.id, year)
      .first<{
        year: number
        total_seconds: number
        top_artists: string
        top_genre: string
        discoveries_count: number
        longest_streak_days: number
        generated_at: string
      }>()

    if (!stats) {
      return errorResponse('No wrapped data for this year', 404)
    }

    // Query wrapped_images for optional image
    const wrappedImage = await env.DB.prepare(
      `SELECT r2_key FROM wrapped_images
       WHERE user_id = ? AND year = ?`
    )
      .bind(user.id, year)
      .first<{ r2_key: string }>()

    // Parse top_artists JSON
    let topArtists: string[] = []
    try {
      topArtists = JSON.parse(stats.top_artists || '[]')
    } catch {
      topArtists = []
    }

    // Convert seconds to hours
    const totalHours = Math.floor(stats.total_seconds / 3600)

    const response: any = {
      year: stats.year,
      total_hours: totalHours,
      top_artists: topArtists,
      top_genre: stats.top_genre,
      discoveries_count: stats.discoveries_count,
      longest_streak_days: stats.longest_streak_days,
      generated_at: stats.generated_at,
    }

    // Add image_url if wrapped image exists
    if (wrappedImage?.r2_key) {
      response.image_url = `/api/wrapped/${year}/download`
    }

    return json(response)
  } catch (error) {
    console.error('[wrapped] getAnnualWrapped error:', error)
    return errorResponse('Failed to fetch wrapped data', 500)
  }
}

/**
 * GET /api/wrapped/:year/download
 * Download wrapped image from R2
 */
async function downloadWrappedImageHandler(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const yearStr = params.year
  if (!yearStr) {
    return errorResponse('Year parameter required', 400)
  }

  // Validate year is a number
  const year = parseInt(yearStr, 10)
  if (isNaN(year)) {
    return errorResponse('Year must be a valid number', 400)
  }

  // Validate year is in valid range
  const currentYear = new Date().getFullYear()
  if (year < 2020 || year > currentYear) {
    return errorResponse(`Year must be between 2020 and ${currentYear}`, 400)
  }

  try {
    // Query wrapped_images
    const wrappedImage = await env.DB.prepare(
      `SELECT r2_key FROM wrapped_images
       WHERE user_id = ? AND year = ?`
    )
      .bind(user.id, year)
      .first<{ r2_key: string }>()

    if (!wrappedImage) {
      return errorResponse('Wrapped image not found', 404)
    }

    // Get image from R2
    const r2Object = await env.WRAPPED_IMAGES.get(wrappedImage.r2_key)
    if (!r2Object) {
      return errorResponse('Wrapped image not found in storage', 404)
    }

    // Return image with proper headers
    return new Response(r2Object.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="zephyron-wrapped-${year}.png"`,
        'Cache-Control': 'public, max-age=2592000', // 30 days
      },
    })
  } catch (error) {
    console.error('[wrapped] downloadWrappedImage error:', error)
    return errorResponse('Failed to download wrapped image', 500)
  }
}

/**
 * GET /api/wrapped/monthly/:yearMonth
 * Retrieve monthly summary (calculate on-demand for current month, cached for past)
 */
async function getMonthlyWrappedHandler(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const yearMonth = params.yearMonth
  if (!yearMonth) {
    return errorResponse('yearMonth parameter required (format: YYYY-MM)', 400)
  }

  // Parse and validate yearMonth format (YYYY-MM)
  const parts = yearMonth.split('-')
  if (parts.length !== 2) {
    return errorResponse('Invalid yearMonth format. Use YYYY-MM', 400)
  }

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)

  if (isNaN(year) || isNaN(month)) {
    return errorResponse('Year and month must be valid numbers', 400)
  }

  if (month < 1 || month > 12) {
    return errorResponse('Month must be between 1 and 12', 400)
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const isCurrentMonth = year === currentYear && month === currentMonth

  try {
    // If current month, calculate on-demand
    if (isCurrentMonth) {
      // Date boundaries: startDate is YYYY-MM-01, endDate is next month's 01
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      // Get base stats from listening_sessions
      const baseStats = await env.DB.prepare(
        `SELECT
          SUM(duration_seconds) as total_duration,
          COUNT(*) as qualifying_sessions,
          COUNT(DISTINCT set_id) as unique_sets
        FROM listening_sessions
        WHERE user_id = ?
          AND session_date >= ?
          AND session_date < ?
          AND qualifies = 1`
      )
        .bind(user.id, startDate, endDate)
        .first<{
          total_duration: number
          qualifying_sessions: number
          unique_sets: number
        }>()

      // If no listening data, return 404
      if (!baseStats || !baseStats.total_duration) {
        return errorResponse('No listening data for this month', 404)
      }

      // Calculate top artists
      const topArtists = await calculateTopArtists(env, user.id, startDate, endDate, 5)

      // Calculate top genre
      const topGenre = await calculateTopGenre(env, user.id, startDate, endDate)

      // Calculate discoveries
      const discoveriesCount = await calculateDiscoveries(env, user.id, startDate, endDate)

      // Calculate longest set
      const longestSetId = await calculateLongestSet(env, user.id, startDate, endDate)

      const totalHours = Math.floor(baseStats.total_duration / 3600)

      return json({
        year,
        month,
        total_hours: totalHours,
        top_artists: topArtists,
        top_genre: topGenre,
        discoveries_count: discoveriesCount,
        longest_set_id: longestSetId,
        generated_at: new Date().toISOString(),
      })
    }

    // For past months, query cached stats
    const cachedStats = await env.DB.prepare(
      `SELECT year, month, total_seconds, top_artists, top_genre, discoveries_count, longest_set_id, generated_at
       FROM user_monthly_stats
       WHERE user_id = ? AND year = ? AND month = ?`
    )
      .bind(user.id, year, month)
      .first<{
        year: number
        month: number
        total_seconds: number
        top_artists: string
        top_genre: string
        discoveries_count: number
        longest_set_id: string
        generated_at: string
      }>()

    if (!cachedStats) {
      return errorResponse('No wrapped data for this month', 404)
    }

    // Parse top_artists JSON
    let topArtists: string[] = []
    try {
      topArtists = JSON.parse(cachedStats.top_artists || '[]')
    } catch {
      topArtists = []
    }

    const totalHours = Math.floor(cachedStats.total_seconds / 3600)

    return json({
      year: cachedStats.year,
      month: cachedStats.month,
      total_hours: totalHours,
      top_artists: topArtists,
      top_genre: cachedStats.top_genre,
      discoveries_count: cachedStats.discoveries_count,
      longest_set_id: cachedStats.longest_set_id,
      generated_at: cachedStats.generated_at,
    })
  } catch (error) {
    console.error('[wrapped] getMonthlyWrapped error:', error)
    return errorResponse('Failed to fetch monthly wrapped data', 500)
  }
}

// Export wrapped with auth middleware applied
export const getAnnualWrapped = withAuth(getAnnualWrappedHandler)
export const downloadWrappedImage = withAuth(downloadWrappedImageHandler)
export const getMonthlyWrapped = withAuth(getMonthlyWrappedHandler)
