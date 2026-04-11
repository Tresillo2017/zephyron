import { json, errorResponse } from '../lib/router'
import { requireAuth } from '../lib/auth'

interface UpdatePrivacyRequest {
  activity_type: string
  is_visible: boolean
}

/**
 * PATCH /api/profile/privacy
 * Updates activity privacy settings for authenticated user
 */
export async function updatePrivacySettings(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult

  try {
    const body = await request.json() as UpdatePrivacyRequest
    const { activity_type, is_visible } = body

    // Validate activity_type
    const validTypes = [
      'badge_earned',
      'song_liked',
      'playlist_created',
      'playlist_updated',
      'annotation_approved',
      'milestone_reached'
    ]

    if (!validTypes.includes(activity_type)) {
      return errorResponse('Invalid activity type', 400)
    }

    // Upsert privacy setting
    await env.DB.prepare(`
      INSERT INTO activity_privacy_settings (user_id, activity_type, is_visible)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, activity_type)
      DO UPDATE SET is_visible = ?
    `).bind(user.id, activity_type, is_visible ? 1 : 0, is_visible ? 1 : 0).run()

    // Update is_public flag on existing activity items
    await env.DB.prepare(`
      UPDATE activity_items
      SET is_public = ?
      WHERE user_id = ? AND activity_type = ?
    `).bind(is_visible ? 1 : 0, user.id, activity_type).run()

    return json({ success: true })

  } catch (error) {
    console.error('Privacy settings update error:', error)
    return errorResponse('Failed to update privacy settings', 500)
  }
}

/**
 * GET /api/profile/privacy
 * Returns all privacy settings for authenticated user
 */
export async function getPrivacySettings(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult

  try {
    const result = await env.DB.prepare(
      'SELECT activity_type, is_visible FROM activity_privacy_settings WHERE user_id = ?'
    ).bind(user.id).all()

    const settings: Record<string, boolean> = {}

    // Default all to true (visible)
    const activityTypes = [
      'badge_earned',
      'song_liked',
      'playlist_created',
      'playlist_updated',
      'annotation_approved',
      'milestone_reached'
    ]

    for (const type of activityTypes) {
      settings[type] = true
    }

    // Override with user's settings
    for (const row of result.results as any[]) {
      settings[row.activity_type] = Boolean(row.is_visible)
    }

    return json({ settings })

  } catch (error) {
    console.error('Privacy settings fetch error:', error)
    return errorResponse('Failed to fetch privacy settings', 500)
  }
}
