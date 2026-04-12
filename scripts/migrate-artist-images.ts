/**
 * Migrate artist images from external URLs to R2 storage
 *
 * This script:
 * 1. Fetches all artists with image_url from database
 * 2. Downloads each image from the external URL
 * 3. Uploads to R2 at key: artists/{id}/image.jpg
 *
 * Usage:
 *   bun run scripts/migrate-artist-images.ts [--dry-run] [--limit N] [--artist-id ID]
 *
 * Options:
 *   --dry-run       Don't actually upload, just show what would be done
 *   --limit N       Only process first N artists (default: all)
 *   --artist-id ID  Only process specific artist by ID
 *
 * Environment variables required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_DATABASE_ID
 *   CLOUDFLARE_D1_TOKEN
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   CLOUDFLARE_R2_BUCKET_NAME (default: zephyron-audio)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

interface Artist {
  id: string
  name: string
  image_url: string | null
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null
const artistIdIndex = args.indexOf('--artist-id')
const artistId = artistIdIndex !== -1 ? args[artistIdIndex + 1] : null

// Validate environment
const requiredEnvVars = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_DATABASE_ID',
  'CLOUDFLARE_D1_TOKEN',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'zephyron-audio'
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID!
const D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN!

// Initialize R2 client
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

// Fetch artists from D1 database
async function fetchArtists(): Promise<Artist[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`

  let sql = 'SELECT id, name, image_url FROM artists WHERE image_url IS NOT NULL'
  if (artistId) {
    sql += ` AND id = '${artistId}'`
  }
  if (limit && !artistId) {
    sql += ` LIMIT ${limit}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${D1_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })

  if (!response.ok) {
    throw new Error(`D1 API error: ${response.status} ${await response.text()}`)
  }

  const data = await response.json() as any
  return data.result[0].results as Artist[]
}

// Download image from URL
async function downloadImage(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  return { buffer, contentType }
}

// Upload image to R2
async function uploadToR2(artistId: string, buffer: ArrayBuffer, contentType: string): Promise<void> {
  const key = `artists/${artistId}/image.jpg`

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: new Uint8Array(buffer),
    ContentType: contentType,
    CacheControl: 'public, max-age=86400',
  }))
}

// Main migration logic
async function migrateArtist(artist: Artist): Promise<{ success: boolean; error?: string }> {
  if (!artist.image_url) {
    return { success: false, error: 'No image URL' }
  }

  try {
    console.log(`  📥 Downloading from ${artist.image_url.substring(0, 60)}...`)
    const { buffer, contentType } = await downloadImage(artist.image_url)

    if (dryRun) {
      console.log(`  ⏭️  [DRY RUN] Would upload ${buffer.byteLength} bytes to artists/${artist.id}/image.jpg`)
      return { success: true }
    }

    console.log(`  📤 Uploading ${buffer.byteLength} bytes to R2...`)
    await uploadToR2(artist.id, buffer, contentType)
    console.log(`  ✅ Uploaded to artists/${artist.id}/image.jpg`)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  ❌ Failed: ${message}`)
    return { success: false, error: message }
  }
}

// Run migration
async function main() {
  console.log('🚀 Artist Image Migration to R2\n')

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No uploads will be performed\n')
  }

  console.log('📊 Fetching artists from database...')
  const artists = await fetchArtists()
  console.log(`   Found ${artists.length} artists with image URLs\n`)

  if (artists.length === 0) {
    console.log('✅ No artists to migrate')
    return
  }

  const results = {
    total: artists.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ artist: string; error: string }>,
  }

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i]
    console.log(`\n[${i + 1}/${artists.length}] ${artist.name} (${artist.id})`)

    const result = await migrateArtist(artist)

    if (result.success) {
      results.success++
    } else {
      results.failed++
      if (result.error) {
        results.errors.push({ artist: artist.name, error: result.error })
      }
    }

    // Rate limit: wait 100ms between uploads
    if (i < artists.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📈 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Total:   ${results.total}`)
  console.log(`Success: ${results.success} ✅`)
  console.log(`Failed:  ${results.failed} ❌`)

  if (results.errors.length > 0) {
    console.log('\n❌ Failed uploads:')
    for (const { artist, error } of results.errors) {
      console.log(`   ${artist}: ${error}`)
    }
  }

  console.log()
}

main().catch(console.error)
