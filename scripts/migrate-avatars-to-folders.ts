/**
 * Script to migrate existing avatars from flat structure to user folders
 *
 * Old structure: userId-timestamp.webp
 * New structure: userId/timestamp.webp
 *
 * Run with: bunx wrangler d1 execute zephyron-db --command="SELECT id, avatar_url FROM user WHERE avatar_url IS NOT NULL" > users.json
 * Then: bun run scripts/migrate-avatars-to-folders.ts
 */

interface User {
  id: string
  avatar_url: string
}

async function migrateAvatars(users: User[]) {
  console.log(`Found ${users.length} users with avatars`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const user of users) {
    try {
      // Extract filename from URL
      // e.g., https://avatars.zephyron.app/userId-timestamp.webp
      const url = new URL(user.avatar_url)
      const filename = url.pathname.substring(1) // Remove leading /

      // Check if already in folder structure (contains /)
      if (filename.includes('/')) {
        console.log(`✓ Skipped ${user.id} (already in folder)`)
        skipped++
        continue
      }

      // Parse old format: userId-timestamp.webp
      const match = filename.match(/^([^-]+)-(\d+\.webp)$/)
      if (!match) {
        console.log(`✗ Skipped ${user.id} (unexpected filename format: ${filename})`)
        skipped++
        continue
      }

      const [, userId, timestampFile] = match

      if (userId !== user.id) {
        console.log(`⚠ Warning: User ID mismatch for ${user.id} (filename has ${userId})`)
      }

      const newKey = `${user.id}/${timestampFile}`
      const newUrl = `https://avatars.zephyron.app/${newKey}`

      console.log(`→ Migrating ${filename} to ${newKey}`)

      // In production, you would:
      // 1. Copy object in R2 from old key to new key
      // 2. Update database with new URL
      // 3. Delete old object
      //
      // This script just shows the migration plan. Actual R2 operations
      // should be done via wrangler or the Cloudflare API

      migrated++
    } catch (error) {
      console.error(`✗ Error migrating ${user.id}:`, error)
      errors++
    }
  }

  console.log(`\nMigration summary:`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
  console.log(`\nTo complete migration, run these R2 commands:`)
  console.log(`1. Copy objects to new keys`)
  console.log(`2. Update database avatar_url values`)
  console.log(`3. Delete old objects`)
}

// Example usage:
// const users = JSON.parse(await Bun.file('users.json').text())
// await migrateAvatars(users)

console.log('Avatar migration script ready')
console.log('Usage: Extract users with avatars, then run migration')
