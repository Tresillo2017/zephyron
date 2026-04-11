import { json, errorResponse } from '../lib/router'
import { requireAuth } from '../lib/auth'
import type { ActivityItem, GetActivityResponse, GetActivityError } from '../types'

/**
 * GET /api/activity/me?page=1
 * Returns personal activity feed for authenticated user (ignores privacy)
 */
export async function getMyActivity(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  // Require authentication
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')

  if (page < 1) {
    return json<GetActivityError>({
      error: 'INVALID_PAGE'
    }, 400)
  }

  const ITEMS_PER_PAGE = 20
  const offset = (page - 1) * ITEMS_PER_PAGE

  try {
    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM activity_items WHERE user_id = ?'
    ).bind(user.id).first() as { total: number } | null

    const total = countResult?.total || 0

    // Get activity items
    const result = await env.DB.prepare(`
      SELECT * FROM activity_items
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.id, ITEMS_PER_PAGE, offset).all()

    const items: ActivityItem[] = result.results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      activity_type: row.activity_type,
      metadata: JSON.parse(row.metadata || '{}'),
      is_public: Boolean(row.is_public),
      created_at: row.created_at
    }))

    return json<GetActivityResponse>({
      items,
      total,
      page,
      hasMore: (page * ITEMS_PER_PAGE) < total
    })

  } catch (error) {
    console.error('Activity fetch error:', error)
    return errorResponse('Failed to fetch activity', 500)
  }
}

/**
 * GET /api/activity/user/:userId
 * Returns public activity for a specific user (respects privacy)
 */
export async function getUserActivity(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const userId = params.userId

  if (!userId || !/^[a-zA-Z0-9_-]{12}$/.test(userId)) {
    return json<GetActivityError>({
      error: 'INVALID_USER_ID'
    }, 400)
  }

  try {
    // Check if user exists and profile is public
    const user = await env.DB.prepare(
      'SELECT id, is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { id: string; is_profile_public: number } | null

    if (!user) {
      return json<GetActivityError>({
        error: 'INVALID_USER_ID'
      }, 404)
    }

    if (user.is_profile_public !== 1) {
      return json<GetActivityError>({
        error: 'PROFILE_PRIVATE'
      }, 403)
    }

    // Get last 5 public activity items (for profile display)
    const result = await env.DB.prepare(`
      SELECT * FROM activity_items
      WHERE user_id = ? AND is_public = 1
      ORDER BY created_at DESC
      LIMIT 5
    `).bind(userId).all()

    const items: ActivityItem[] = result.results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      activity_type: row.activity_type,
      metadata: JSON.parse(row.metadata || '{}'),
      is_public: Boolean(row.is_public),
      created_at: row.created_at
    }))

    return json<GetActivityResponse>({
      items,
      total: items.length,
      page: 1,
      hasMore: false
    })

  } catch (error) {
    console.error('User activity fetch error:', error)
    return errorResponse('Failed to fetch activity', 500)
  }
}

/**
 * GET /api/activity/community?page=1
 * Returns global community feed (all public activity)
 */
export async function getCommunityActivity(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')

  if (page < 1) {
    return json<GetActivityError>({
      error: 'INVALID_PAGE'
    }, 400)
  }

  const ITEMS_PER_PAGE = 20
  const offset = (page - 1) * ITEMS_PER_PAGE

  try {
    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM activity_items WHERE is_public = 1'
    ).first() as { total: number } | null

    const total = countResult?.total || 0

    // Get activity items with user info joined
    const result = await env.DB.prepare(`
      SELECT ai.*, u.name as user_name, u.avatar_url as user_avatar_url
      FROM activity_items ai
      JOIN user u ON ai.user_id = u.id
      WHERE ai.is_public = 1
      ORDER BY ai.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(ITEMS_PER_PAGE, offset).all()

    const items: ActivityItem[] = result.results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_avatar_url: row.user_avatar_url,
      activity_type: row.activity_type,
      metadata: JSON.parse(row.metadata || '{}'),
      is_public: Boolean(row.is_public),
      created_at: row.created_at
    }))

    return json<GetActivityResponse>({
      items,
      total,
      page,
      hasMore: (page * ITEMS_PER_PAGE) < total
    })

  } catch (error) {
    console.error('Community activity fetch error:', error)
    return errorResponse('Failed to fetch community activity', 500)
  }
}
