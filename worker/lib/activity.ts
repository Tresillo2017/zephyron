import { nanoid } from 'nanoid'
import type { ActivityItem } from '../types'

/**
 * Create an activity item and insert into database
 * Respects user privacy settings
 */
export async function createActivityItem(
  env: Env,
  userId: string,
  activityType: ActivityItem['activity_type'],
  metadata: Record<string, any>
): Promise<void> {
  try {
    // Get user's profile visibility and activity privacy settings
    const user = await env.DB.prepare(
      'SELECT is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { is_profile_public: number } | null

    if (!user) return

    // Check specific activity type privacy setting
    const privacySetting = await env.DB.prepare(
      'SELECT is_visible FROM activity_privacy_settings WHERE user_id = ? AND activity_type = ?'
    ).bind(userId, activityType).first() as { is_visible: number } | null

    // Default to visible (1) if no setting exists
    const activityVisible = privacySetting ? privacySetting.is_visible : 1

    // Activity is public only if both profile is public AND activity type is visible
    const isPublic = user.is_profile_public === 1 && activityVisible === 1 ? 1 : 0

    // Insert activity item
    await env.DB.prepare(`
      INSERT INTO activity_items (id, user_id, activity_type, metadata, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      nanoid(12),
      userId,
      activityType,
      JSON.stringify(metadata),
      isPublic
    ).run()

  } catch (error) {
    // Log but don't throw - activity creation failures should not block original action
    console.error('Failed to create activity item:', error)
  }
}
