import { json, errorResponse } from '../lib/router'
import { getBadgeById } from '../lib/badges'
import type { UserBadge, GetBadgesResponse, GetBadgesError } from '../types'

/**
 * GET /api/profile/:userId/badges
 * Returns all earned badges for a user with badge definitions joined
 */
export async function getBadges(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const userId = params.userId

  // Validate user ID format
  if (!userId || !/^[a-zA-Z0-9_-]{12}$/.test(userId)) {
    return json<GetBadgesError>({
      error: 'INVALID_USER_ID'
    }, 400)
  }

  try {
    // Check if user exists and profile is public
    const user = await env.DB.prepare(
      'SELECT id, is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { id: string; is_profile_public: number } | null

    if (!user) {
      return json<GetBadgesError>({
        error: 'USER_NOT_FOUND'
      }, 404)
    }

    if (user.is_profile_public !== 1) {
      return json<GetBadgesError>({
        error: 'PROFILE_PRIVATE'
      }, 403)
    }

    // Fetch user's earned badges
    const result = await env.DB.prepare(`
      SELECT id, user_id, badge_id, earned_at
      FROM user_badges
      WHERE user_id = ?
      ORDER BY earned_at DESC
    `).bind(userId).all()

    // Join with badge definitions
    const badges: UserBadge[] = result.results.map((row: any) => {
      const badge = getBadgeById(row.badge_id)
      return {
        id: row.id,
        user_id: row.user_id,
        badge_id: row.badge_id,
        earned_at: row.earned_at,
        badge: badge ? {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          rarity: badge.rarity,
          checkFn: badge.checkFn
        } : undefined
      } as UserBadge
    })

    return json<GetBadgesResponse>({ badges })

  } catch (error) {
    console.error('Badges fetch error:', error)
    return errorResponse('Failed to fetch badges', 500)
  }
}
