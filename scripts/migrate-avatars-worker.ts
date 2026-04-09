/**
 * One-off Worker script to migrate avatars to user folders
 *
 * Deploy with: bunx wrangler deploy scripts/migrate-avatars-worker.ts --name avatar-migrator --compatibility-date=2024-01-01
 * Run with: curl https://avatar-migrator.<your-subdomain>.workers.dev
 * Delete after: bunx wrangler delete avatar-migrator
 */

interface Env {
  AVATARS: R2Bucket
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Fetch all users with avatars
      const users = await env.DB.prepare(
        `SELECT id, avatar_url
         FROM user
         WHERE avatar_url IS NOT NULL
           AND avatar_url LIKE '%avatars.zephyron.app/%'`
      ).all<{ id: string; avatar_url: string }>()

      const results = {
        total: users.results.length,
        migrated: 0,
        skipped: 0,
        errors: [] as string[],
      }

      for (const user of users.results) {
        try {
          // Extract filename from URL
          const url = new URL(user.avatar_url)
          const oldKey = url.pathname.substring(1) // Remove leading /

          // Skip if already in folder structure
          if (oldKey.includes('/')) {
            results.skipped++
            continue
          }

          // Parse old format: userId-timestamp.webp
          const match = oldKey.match(/^([^-]+)-(\d+\.webp)$/)
          if (!match) {
            results.errors.push(`Invalid format for ${user.id}: ${oldKey}`)
            continue
          }

          const [, fileUserId, timestampFile] = match
          const newKey = `${user.id}/${timestampFile}`
          const newUrl = `https://avatars.zephyron.app/${newKey}`

          // Copy object to new location
          const object = await env.AVATARS.get(oldKey)
          if (!object) {
            results.errors.push(`Object not found: ${oldKey}`)
            continue
          }

          await env.AVATARS.put(newKey, object.body, {
            httpMetadata: {
              contentType: 'image/webp',
            },
          })

          // Update database
          await env.DB.prepare(
            'UPDATE user SET avatar_url = ? WHERE id = ?'
          ).bind(newUrl, user.id).run()

          // Delete old object
          await env.AVATARS.delete(oldKey)

          results.migrated++
        } catch (error) {
          results.errors.push(`Error migrating ${user.id}: ${error}`)
        }
      }

      return Response.json(results, { status: 200 })
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 })
    }
  },
}
