// Song service — CRUD operations, deduplication, cover art caching.
// Songs are first-class entities linked to detections via detection.song_id.

import { generateId } from '../lib/id'
import { lookupTrack, searchTrack } from './lastfm'

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface SongRecord {
  id: string
  title: string
  artist: string
  label: string | null
  album: string | null
  cover_art_url: string | null
  cover_art_r2_key: string | null
  spotify_url: string | null
  apple_music_url: string | null
  soundcloud_url: string | null
  beatport_url: string | null
  youtube_url: string | null
  deezer_url: string | null
  bandcamp_url: string | null
  traxsource_url: string | null
  lastfm_url: string | null
  lastfm_track_mbid: string | null
  lastfm_album: string | null
  lastfm_album_art: string | null
  lastfm_duration_ms: number | null
  lastfm_tags: string | null
  lastfm_listeners: number | null
  source: string | null
  external_id: string | null
  created_at: string
  updated_at: string
}

export interface SongInput {
  title: string
  artist: string
  label?: string
  album?: string
  cover_art_url?: string
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  beatport_url?: string
  youtube_url?: string
  deezer_url?: string
  bandcamp_url?: string
  traxsource_url?: string
  source?: string
  external_id?: string
}

// ═══════════════════════════════════════════
// Find or create
// ═══════════════════════════════════════════

/**
 * Find an existing song by artist+title (fuzzy match) or create a new one.
 * Returns the song ID.
 */
export async function findOrCreateSong(
  input: SongInput,
  env: Env
): Promise<string> {
  // 1. Try exact match on artist + title (case-insensitive)
  const existing = await env.DB.prepare(
    `SELECT id FROM songs
     WHERE LOWER(artist) = LOWER(?) AND LOWER(title) = LOWER(?)
     LIMIT 1`
  ).bind(input.artist, input.title).first<{ id: string }>()

  if (existing) {
    // Update with any new links we didn't have before
    await mergeSongLinks(existing.id, input, env)
    return existing.id
  }

  // 2. Try fuzzy match — strip remix/edit suffixes and feat. artists
  const cleanTitle = input.title
    .replace(/\s*\((?:remix|edit|bootleg|version|mix|original mix|extended mix|radio edit|VIP|dub mix)[^)]*\)/gi, '')
    .replace(/\s*feat\.?\s+[^-]+$/i, '')
    .trim()

  const cleanArtist = input.artist
    .replace(/\s*(?:feat\.?|ft\.?|&|,|vs\.?)\s+.*/i, '')
    .trim()

  if (cleanTitle !== input.title || cleanArtist !== input.artist) {
    const fuzzy = await env.DB.prepare(
      `SELECT id FROM songs
       WHERE LOWER(artist) = LOWER(?) AND LOWER(title) = LOWER(?)
       LIMIT 1`
    ).bind(cleanArtist, cleanTitle).first<{ id: string }>()

    if (fuzzy) {
      await mergeSongLinks(fuzzy.id, input, env)
      return fuzzy.id
    }
  }

  // 3. Try match by external_id if provided
  if (input.external_id) {
    const byExtId = await env.DB.prepare(
      'SELECT id FROM songs WHERE external_id = ? LIMIT 1'
    ).bind(input.external_id).first<{ id: string }>()

    if (byExtId) {
      await mergeSongLinks(byExtId.id, input, env)
      return byExtId.id
    }
  }

  // 4. No match — create new song
  const id = generateId()

  await env.DB.prepare(
    `INSERT INTO songs (
      id, title, artist, label, album, cover_art_url,
      spotify_url, apple_music_url, soundcloud_url, beatport_url,
      youtube_url, deezer_url, bandcamp_url, traxsource_url,
      source, external_id, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`
  ).bind(
    id,
    input.title,
    input.artist,
    input.label || null,
    input.album || null,
    input.cover_art_url || null,
    input.spotify_url || null,
    input.apple_music_url || null,
    input.soundcloud_url || null,
    input.beatport_url || null,
    input.youtube_url || null,
    input.deezer_url || null,
    input.bandcamp_url || null,
    input.traxsource_url || null,
    input.source || 'manual',
    input.external_id || null,
  ).run()

  return id
}

/**
 * Merge new link data into an existing song (only fills nulls, doesn't overwrite).
 */
async function mergeSongLinks(songId: string, input: SongInput, env: Env): Promise<void> {
  const updates: string[] = []
  const values: unknown[] = []

  const linkFields: Array<[keyof SongInput, string]> = [
    ['label', 'label'],
    ['album', 'album'],
    ['cover_art_url', 'cover_art_url'],
    ['spotify_url', 'spotify_url'],
    ['apple_music_url', 'apple_music_url'],
    ['soundcloud_url', 'soundcloud_url'],
    ['beatport_url', 'beatport_url'],
    ['youtube_url', 'youtube_url'],
    ['deezer_url', 'deezer_url'],
    ['bandcamp_url', 'bandcamp_url'],
    ['traxsource_url', 'traxsource_url'],
  ]

  for (const [inputKey, dbCol] of linkFields) {
    if (input[inputKey]) {
      // Only update if the current value is null
      updates.push(`${dbCol} = COALESCE(${dbCol}, ?)`)
      values.push(input[inputKey])
    }
  }

  if (updates.length === 0) return

  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(songId)

  await env.DB.prepare(
    `UPDATE songs SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run()
}

// ═══════════════════════════════════════════
// Last.fm enrichment
// ═══════════════════════════════════════════

/**
 * Enrich a song record with Last.fm data (album art, tags, listeners, etc.).
 * Only updates fields that are currently null.
 */
export async function enrichSongWithLastfm(
  songId: string,
  artist: string,
  title: string,
  env: Env
): Promise<void> {
  const lastfmKey = env.LASTFM_API_KEY && env.LASTFM_API_KEY.length > 5 ? env.LASTFM_API_KEY : undefined
  if (!lastfmKey) return

  // Check if already enriched
  const existing = await env.DB.prepare(
    'SELECT lastfm_url FROM songs WHERE id = ?'
  ).bind(songId).first<{ lastfm_url: string | null }>()

  if (existing?.lastfm_url) return // Already enriched

  const searchTitle = title
    .replace(/\s*\((?:Intro Edit|Soundcloud|Free DL|Free Download)\)\s*/gi, '')
    .trim()

  // Try exact match
  let lfm = await lookupTrack(artist, searchTitle, lastfmKey)

  // Try without remix/edit suffix
  if (!lfm && searchTitle.includes('(')) {
    const cleanTitle = searchTitle.replace(/\s*\([^)]*(?:remix|edit|bootleg|version|mix)\)$/i, '').trim()
    if (cleanTitle !== searchTitle) {
      lfm = await lookupTrack(artist, cleanTitle, lastfmKey)
    }
  }

  // Try search
  if (!lfm) {
    const results = await searchTrack(`${artist} ${searchTitle}`, lastfmKey, 1)
    if (results.length > 0) lfm = results[0]
  }

  if (!lfm) return

  await env.DB.prepare(
    `UPDATE songs SET
      lastfm_url = COALESCE(lastfm_url, ?),
      lastfm_track_mbid = COALESCE(lastfm_track_mbid, ?),
      lastfm_album = COALESCE(lastfm_album, ?),
      lastfm_album_art = COALESCE(lastfm_album_art, ?),
      lastfm_duration_ms = COALESCE(lastfm_duration_ms, ?),
      lastfm_tags = COALESCE(lastfm_tags, ?),
      lastfm_listeners = COALESCE(lastfm_listeners, ?),
      cover_art_url = COALESCE(cover_art_url, ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  ).bind(
    lfm.url || null,
    lfm.mbid || null,
    lfm.album || null,
    lfm.albumArt || null,
    lfm.durationMs || null,
    lfm.tags ? JSON.stringify(lfm.tags) : null,
    lfm.listeners || null,
    lfm.albumArt || null, // Use album art as fallback cover
    songId,
  ).run()
}

// ═══════════════════════════════════════════
// Cover art caching (download to R2)
// ═══════════════════════════════════════════

const COVER_FETCH_TIMEOUT_MS = 10000   // 10s max per image fetch
const COVER_MAX_SIZE_BYTES = 2_000_000 // 2MB max image size

/**
 * Download a song's cover art from an external URL and cache it in R2.
 * Accepts an optional imageUrl to skip the DB read (faster during bulk import).
 * Has timeout and size limits to avoid blocking on slow/large images.
 */
export async function cacheSongCoverArt(
  songId: string,
  env: Env,
  imageUrl?: string | null
): Promise<string | null> {
  // If no URL provided, read from DB
  if (!imageUrl) {
    const song = await env.DB.prepare(
      'SELECT cover_art_url, cover_art_r2_key, lastfm_album_art FROM songs WHERE id = ?'
    ).bind(songId).first<{
      cover_art_url: string | null
      cover_art_r2_key: string | null
      lastfm_album_art: string | null
    }>()

    if (!song) return null
    if (song.cover_art_r2_key) return song.cover_art_r2_key
    imageUrl = song.cover_art_url || song.lastfm_album_art
  }

  if (!imageUrl) return null

  // Skip URLs that are obviously not images
  if (imageUrl.includes('default_100') || imageUrl.includes('default_')) return null

  try {
    // Fetch with timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), COVER_FETCH_TIMEOUT_MS)

    const resp = await fetch(imageUrl, { signal: controller.signal })
    clearTimeout(timer)

    if (!resp.ok) return null

    // Check content length before downloading
    const contentLength = parseInt(resp.headers.get('Content-Length') || '0')
    if (contentLength > COVER_MAX_SIZE_BYTES) {
      console.warn(`[songs] Cover art too large (${contentLength} bytes) for ${songId}, skipping`)
      return null
    }

    const contentType = resp.headers.get('Content-Type') || 'image/jpeg'

    // Only cache actual images
    if (!contentType.startsWith('image/')) return null

    const buffer = await resp.arrayBuffer()
    if (buffer.byteLength === 0 || buffer.byteLength > COVER_MAX_SIZE_BYTES) return null

    const r2Key = `songs/${songId}/cover${extensionForMime(contentType)}`

    await env.AUDIO_BUCKET.put(r2Key, buffer, {
      httpMetadata: { contentType },
    })

    await env.DB.prepare(
      'UPDATE songs SET cover_art_r2_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(r2Key, songId).run()

    return r2Key
  } catch (err) {
    // AbortError is expected on timeout — don't log as error
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn(`[songs] Cover art fetch timed out for ${songId}`)
    } else {
      console.warn(`[songs] Cover art cache failed for ${songId}: ${err instanceof Error ? err.message : String(err)}`)
    }
    return null
  }
}

/**
 * Batch cache cover art for multiple songs. Runs in parallel with concurrency limit.
 * Designed to be called via ctx.waitUntil() so it doesn't block the response.
 */
export async function batchCacheCoverArt(
  songs: Array<{ songId: string; imageUrl?: string | null }>,
  env: Env,
  concurrency = 4
): Promise<void> {
  let i = 0
  const run = async () => {
    while (i < songs.length) {
      const item = songs[i++]
      try {
        await cacheSongCoverArt(item.songId, env, item.imageUrl)
      } catch { /* non-blocking */ }
    }
  }

  // Run N workers in parallel
  const workers = Array.from({ length: Math.min(concurrency, songs.length) }, () => run())
  await Promise.all(workers)
}

function extensionForMime(mime: string): string {
  if (mime.includes('webp')) return '.webp'
  if (mime.includes('png')) return '.png'
  if (mime.includes('gif')) return '.gif'
  return '.jpg'
}

// ═══════════════════════════════════════════
// Query helpers
// ═══════════════════════════════════════════

/**
 * Get a song by ID with all fields.
 */
export async function getSongById(
  songId: string,
  env: Env
): Promise<SongRecord | null> {
  return env.DB.prepare('SELECT * FROM songs WHERE id = ?')
    .bind(songId)
    .first<SongRecord>()
}
