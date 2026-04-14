import { nanoid } from 'nanoid'
import { BADGE_DEFINITIONS, getBadgeById } from './badges'
import { createActivityItem } from './activity'
import type { Env } from '../types'

/**
 * Process badges for a single user
 * Checks all badge definitions and awards newly earned badges
 */
export async function processBadgesForUser(
  userId: string,
  env: Env
): Promise<{ awarded: number; errors: number }> {
  let awarded = 0
  let errors = 0

  // Get already earned badges
  const earnedResult = await env.DB.prepare(
    'SELECT badge_id FROM user_badges WHERE user_id = ?'
  ).bind(userId).all()

  const earnedBadgeIds = new Set(
    earnedResult.results.map((row: any) => row.badge_id)
  )

  // Check each badge definition
  for (const badge of BADGE_DEFINITIONS) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) {
      continue
    }

    try {
      // Check if user is eligible for this badge
      const eligible = await badge.checkFn(userId, env)

      if (eligible) {
        // Award badge
        await env.DB.prepare(`
          INSERT INTO user_badges (id, user_id, badge_id, earned_at)
          VALUES (?, ?, ?, datetime('now'))
        `).bind(nanoid(12), userId, badge.id).run()

        // Create activity item
        await createActivityItem(env, userId, 'badge_earned', {
          badge_id: badge.id,
          badge_name: badge.name
        })

        awarded++
        console.log(`Awarded badge "${badge.name}" to user ${userId}`)
      }
    } catch (error) {
      errors++
      console.error(`Error checking badge "${badge.id}" for user ${userId}:`, error)
    }
  }

  return { awarded, errors }
}

/**
 * Process badges for all users (called by cron)
 * Processes in batches to avoid memory issues
 */
export async function processBadgesForAllUsers(env: Env): Promise<void> {
  const startTime = Date.now()
  let totalAwarded = 0
  let totalErrors = 0
  let usersProcessed = 0

  console.log('Starting badge calculation for all users...')

  try {
    // Get all user IDs
    const usersResult = await env.DB.prepare('SELECT id FROM user').all()
    const userIds = usersResult.results.map((row: any) => row.id)

    // Process in batches of 100
    const BATCH_SIZE = 100
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE)

      for (const userId of batch) {
        const result = await processBadgesForUser(userId, env)
        totalAwarded += result.awarded
        totalErrors += result.errors
        usersProcessed++

        // Timeout check (max 4 minutes, leave 1 minute buffer for cleanup)
        if (Date.now() - startTime > 4 * 60 * 1000) {
          console.warn('Badge calculation timeout approaching, stopping early')
          break
        }
      }

      // Break outer loop if timeout
      if (Date.now() - startTime > 4 * 60 * 1000) {
        break
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`Badge calculation complete: ${totalAwarded} badges awarded to ${usersProcessed} users in ${duration}s`)

    if (totalErrors > 0) {
      console.error(`Badge calculation encountered ${totalErrors} errors`)
    }

  } catch (error) {
    console.error('Badge calculation failed:', error)
    throw error
  }
}

/**
 * Check and award specific badges for a user (for real-time checks)
 * Use this after actions that might earn badges (session complete, playlist create, etc.)
 */
export async function checkBadgesForUser(
  userId: string,
  env: Env,
  badgeIds: string[]
): Promise<void> {
  for (const badgeId of badgeIds) {
    const badge = getBadgeById(badgeId)
    if (!badge) continue

    try {
      // Check if already earned
      const existing = await env.DB.prepare(
        'SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?'
      ).bind(userId, badgeId).first()

      if (existing) continue

      // Check eligibility
      const eligible = await badge.checkFn(userId, env)

      if (eligible) {
        // Award badge
        await env.DB.prepare(`
          INSERT INTO user_badges (id, user_id, badge_id, earned_at)
          VALUES (?, ?, ?, datetime('now'))
        `).bind(nanoid(12), userId, badge.id).run()

        // Create activity item
        await createActivityItem(env, userId, 'badge_earned', {
          badge_id: badge.id,
          badge_name: badge.name
        })

        console.log(`Real-time badge award: "${badge.name}" to user ${userId}`)
      }
    } catch (error) {
      console.error(`Error checking real-time badge "${badgeId}":`, error)
    }
  }
}
