// ML Detection Pipeline v2
// Extracts tracklists from YouTube description + comments via LLM,
// then enriches each track with Last.fm data.
// Replaces the broken Whisper-based approach.

import { generateId } from '../lib/id'
import { extractVideoId, fetchVideoData } from './youtube'
import { fetchRelevantComments } from './youtube-comments'
import { parseTracklist, type ParsedTrack } from './tracklist-parser'
import { lookupTrack, lookupArtist, searchTrack } from './lastfm'

/**
 * Run the full detection pipeline for a DJ set.
 * This is now synchronous (called directly, not via queue).
 *
 * Flow:
 * 1. Fetch YouTube description + comments (if source_url exists)
 * 2. Extract tracklist via LLM + regex fallback
 * 3. Enrich each track with Last.fm data
 * 4. Create/update artist record
 * 5. Write detections to D1
 */
export async function runDetectionPipeline(
  setId: string,
  env: Env
): Promise<{ detections: number; artist_id?: string; error?: string }> {
  // 1. Fetch set metadata
  const set = await env.DB.prepare(
    'SELECT id, title, artist, source_url, genre, duration_seconds FROM sets WHERE id = ?'
  )
    .bind(setId)
    .first<{
      id: string
      title: string
      artist: string
      source_url: string | null
      genre: string | null
      duration_seconds: number
    }>()

  if (!set) {
    return { detections: 0, error: 'Set not found' }
  }

  // Update status
  await env.DB.prepare(
    "UPDATE sets SET detection_status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(setId).run()

  try {
    const apiKey = env.YOUTUBE_API_KEY && env.YOUTUBE_API_KEY.length > 5 ? env.YOUTUBE_API_KEY : undefined
    const lastfmKey = env.LASTFM_API_KEY && env.LASTFM_API_KEY.length > 5 ? env.LASTFM_API_KEY : undefined

    let tracks: ParsedTrack[] = []

    // 2. Try to extract tracklist from YouTube data
    if (set.source_url && apiKey) {
      console.log(`[detect] Fetching YouTube data for ${set.source_url}`)

      // Fetch full video data (description, etc.)
      const videoId = extractVideoId(set.source_url)

      if (videoId) {
        const videoData = await fetchVideoData(videoId, apiKey, set.source_url)
        console.log(`[detect] YouTube description: ${videoData.description.length} chars`)

        // Fetch comments
        const comments = await fetchRelevantComments(set.source_url, apiKey, 2)
        console.log(`[detect] Found ${comments.length} relevant comments`)

        // Parse tracklist from description + comments
        tracks = await parseTracklist(videoData.description, comments, env)
        console.log(`[detect] Parsed ${tracks.length} tracks from YouTube data`)
      }
    }

    if (tracks.length === 0) {
      // No tracks found — mark as needing community annotation
      await env.DB.prepare(
        "UPDATE sets SET detection_status = 'complete', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(setId).run()

      return { detections: 0 }
    }

    // 3. Clear old detections
    await env.DB.prepare('DELETE FROM detections WHERE set_id = ?').bind(setId).run()

    // 4. Enrich each track with Last.fm data and insert
    let enrichedCount = 0
    for (const track of tracks) {
      const detectionId = generateId()
      let lastfmData: {
        url: string
        mbid: string
        album: string | null
        albumArt: string | null
        durationMs: number
        tags: string[]
        listeners: number
      } | null = null

      // Look up on Last.fm
      if (lastfmKey && track.title) {
        const searchArtist = track.artist || ''
        const searchTitle = track.title
          .replace(/\s*\((?:Intro Edit|Soundcloud|Free DL|Free Download)\)\s*/gi, '')
          .trim()

        // Try exact match first
        let lfm = searchArtist
          ? await lookupTrack(searchArtist, searchTitle, lastfmKey)
          : null

        // Try without remix/edit suffix
        if (!lfm && searchTitle.includes('(')) {
          const cleanTitle = searchTitle.replace(/\s*\([^)]*(?:remix|edit|bootleg|version|mix)\)$/i, '').trim()
          if (cleanTitle !== searchTitle) {
            lfm = await lookupTrack(searchArtist, cleanTitle, lastfmKey)
          }
        }

        // Try search as fallback
        if (!lfm) {
          const query = searchArtist ? `${searchArtist} ${searchTitle}` : searchTitle
          const searchResults = await searchTrack(query, lastfmKey, 1)
          if (searchResults.length > 0) {
            lfm = searchResults[0]
          }
        }

        if (lfm) {
          lastfmData = {
            url: lfm.url,
            mbid: lfm.mbid,
            album: lfm.album,
            albumArt: lfm.albumArt,
            durationMs: lfm.durationMs,
            tags: lfm.tags,
            listeners: lfm.listeners,
          }
          enrichedCount++
        }
      }

      // Calculate end time
      const trackIndex = tracks.indexOf(track)
      const endTime = trackIndex + 1 < tracks.length
        ? tracks[trackIndex + 1].start_seconds
        : set.duration_seconds

      await env.DB.prepare(
        `INSERT INTO detections (id, set_id, track_title, track_artist, start_time_seconds, end_time_seconds, confidence, detection_method, lastfm_url, lastfm_track_mbid, lastfm_album, lastfm_album_art, lastfm_duration_ms, lastfm_tags, lastfm_listeners)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          detectionId,
          setId,
          track.title,
          track.artist || null,
          track.start_seconds,
          endTime,
          track.source === 'regex' ? 0.85 : 0.95, // LLM-parsed = higher confidence
          track.source === 'regex' ? 'youtube_regex' : 'youtube_tracklist',
          lastfmData?.url || null,
          lastfmData?.mbid || null,
          lastfmData?.album || null,
          lastfmData?.albumArt || null,
          lastfmData?.durationMs || null,
          lastfmData?.tags ? JSON.stringify(lastfmData.tags) : null,
          lastfmData?.listeners || null
        )
        .run()
    }

    console.log(`[detect] Inserted ${tracks.length} detections (${enrichedCount} enriched with Last.fm)`)

    // 5. Create/update artist record
    let artistId: string | undefined
    if (lastfmKey && set.artist) {
      artistId = (await ensureArtist(set.artist, lastfmKey, setId, env)) ?? undefined
      if (artistId) {
        await env.DB.prepare('UPDATE sets SET artist_id = ? WHERE id = ?')
          .bind(artistId, setId)
          .run()
      }
    }

    // 6. Update status
    await env.DB.prepare(
      "UPDATE sets SET detection_status = 'complete', detection_version = detection_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(setId).run()

    return { detections: tracks.length, artist_id: artistId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[detect] Pipeline failed for ${setId}:`, err)

    await env.DB.prepare(
      "UPDATE sets SET detection_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(setId).run()

    return { detections: 0, error: errorMsg }
  }
}

/**
 * Ensure an artist record exists in the DB, creating + enriching from Last.fm if needed.
 * Uses the set's cover image as fallback for artist photo (Last.fm deprecated their image CDN).
 */
async function ensureArtist(
  artistName: string,
  lastfmKey: string,
  setId: string,
  env: Env
): Promise<string | null> {
  const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Check if artist already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM artists WHERE slug = ? OR name = ?'
  ).bind(slug, artistName).first<{ id: string }>()

  if (existing) return existing.id

  // Look up on Last.fm
  const lfm = await lookupArtist(artistName, lastfmKey)

  // If Last.fm has no image, use the set's cover image as fallback
  let imageUrl = lfm?.imageUrl || null
  if (!imageUrl) {
    const setCover = await env.DB.prepare(
      'SELECT cover_image_r2_key FROM sets WHERE id = ?'
    ).bind(setId).first<{ cover_image_r2_key: string | null }>()

    if (setCover?.cover_image_r2_key) {
      imageUrl = `/api/sets/${setId}/cover`
    }
  }

  const id = generateId()

  await env.DB.prepare(
    `INSERT INTO artists (id, name, slug, lastfm_url, lastfm_mbid, image_url, bio_summary, bio_full, tags, similar_artists, listeners, playcount, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  )
    .bind(
      id,
      lfm?.name || artistName,
      slug,
      lfm?.url || null,
      lfm?.mbid || null,
      imageUrl,
      lfm?.bioSummary || null,
      lfm?.bioFull || null,
      lfm?.tags ? JSON.stringify(lfm.tags) : null,
      lfm?.similarArtists ? JSON.stringify(lfm.similarArtists) : null,
      lfm?.listeners || 0,
      lfm?.playcount || 0
    )
    .run()

  console.log(`[detect] Created artist: ${lfm?.name || artistName} (${id})`)
  return id
}
