// ML Detection Pipeline v2 — Invidious Edition
// Extracts tracklists from YouTube description + comments via Invidious API + LLM,
// then enriches each track with Last.fm data.

import { generateId } from '../lib/id'
import { extractVideoId } from './youtube'
import { fetchVideoData, fetchRelevantComments, type InvidiousVideoData } from './invidious'
import { parseTracklist, type ParsedTrack } from './tracklist-parser'
import { lookupTrack, lookupArtist, searchTrack } from './lastfm'

/**
 * Run the full detection pipeline for a DJ set.
 * This is now synchronous (called directly, not via queue).
 *
 * Flow:
 * 1. Fetch YouTube description + comments via Invidious (if source_url or youtube_video_id exists)
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
    'SELECT id, title, artist, source_url, youtube_video_id, genre, event, duration_seconds FROM sets WHERE id = ?'
  )
    .bind(setId)
    .first<{
      id: string
      title: string
      artist: string
      source_url: string | null
      youtube_video_id: string | null
      genre: string | null
      event: string | null
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
    const lastfmKey = env.LASTFM_API_KEY && env.LASTFM_API_KEY.length > 5 ? env.LASTFM_API_KEY : undefined

    let tracks: ParsedTrack[] = []

    // 2. Try to extract tracklist from Invidious data
    const videoId = set.youtube_video_id || (set.source_url ? extractVideoId(set.source_url) : null)

    if (videoId) {
      console.log(`[detect] Fetching Invidious data for video ${videoId}`)

      // Fetch full video data via Invidious
      let videoData: InvidiousVideoData
      try {
        videoData = await fetchVideoData(videoId, env)
        console.log(`[detect] Invidious description: ${videoData.description.length} chars`)
      } catch (err) {
        console.error(`[detect] Invidious fetch failed:`, err)
        await env.DB.prepare(
          "UPDATE sets SET detection_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(setId).run()
        return { detections: 0, error: `Invidious API error: ${err instanceof Error ? err.message : String(err)}` }
      }

      // Fetch comments via Invidious
      const comments = await fetchRelevantComments(videoId, env, 2)
      console.log(`[detect] Found ${comments.length} relevant comments`)

      // Use musicTracks from Invidious as additional hint for the parser
      // Convert musicTracks to a "tracklist-like" string for the parser
      let musicTracksText = ''
      if (videoData.musicTracks.length > 0) {
        musicTracksText = videoData.musicTracks
          .map((t, i) => `${i + 1}. ${t.artist} - ${t.song}${t.album ? ` [${t.album}]` : ''}`)
          .join('\n')
        console.log(`[detect] Found ${videoData.musicTracks.length} musicTracks from Invidious`)
      }

      // Combine description with musicTracks for better parsing
      const combinedDescription = musicTracksText
        ? `${videoData.description}\n\n--- YouTube Music Tracks ---\n${musicTracksText}`
        : videoData.description

      // Parse tracklist from description + comments
      tracks = await parseTracklist(combinedDescription, comments, env)
      console.log(`[detect] Parsed ${tracks.length} tracks from Invidious data`)
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

    // 5b. Auto-link to event if event name detected (auto-creates if needed)
    if (set.event) {
      try {
        const eventId = await ensureEvent(set.event, setId, env)
        if (eventId) {
          await env.DB.prepare('UPDATE sets SET event_id = ? WHERE id = ?')
            .bind(eventId, setId).run()
          console.log(`[detect] Linked set to event: ${set.event} (${eventId})`)
        }
      } catch (err) {
        console.error('[detect] Event auto-link failed (non-blocking):', err)
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
 * Uses the set's cover image (from Invidious thumbnail, stored in R2) as artist background.
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

  // Use set's cover image as artist photo fallback
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

  // Use the set's cover image as artist background (no more direct YouTube thumbnail fetch)
  let backgroundUrl: string | null = null
  try {
    const setCover = await env.DB.prepare(
      'SELECT cover_image_r2_key FROM sets WHERE id = ?'
    ).bind(setId).first<{ cover_image_r2_key: string | null }>()

    if (setCover?.cover_image_r2_key) {
      // Copy the set's cover to the artist background
      const coverObject = await env.AUDIO_BUCKET.get(setCover.cover_image_r2_key)
      if (coverObject && coverObject.body) {
        const bgKey = `artists/${id}/background.jpg`
        await env.AUDIO_BUCKET.put(bgKey, coverObject.body, {
          httpMetadata: { contentType: coverObject.httpMetadata?.contentType || 'image/jpeg' },
        })
        backgroundUrl = `/api/artists/${id}/background`
        console.log(`[detect] Stored artist background from set cover: ${bgKey}`)
      }
    }
  } catch (err) {
    console.error('[detect] Artist background from set cover failed (non-blocking):', err)
  }

  await env.DB.prepare(
    `INSERT INTO artists (id, name, slug, lastfm_url, lastfm_mbid, image_url, background_url, bio_summary, bio_full, tags, similar_artists, listeners, playcount, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  )
    .bind(
      id,
      lfm?.name || artistName,
      slug,
      lfm?.url || null,
      lfm?.mbid || null,
      imageUrl,
      backgroundUrl,
      lfm?.bioSummary || null,
      lfm?.bioFull || null,
      lfm?.tags ? JSON.stringify(lfm.tags) : null,
      lfm?.similarArtists ? JSON.stringify(lfm.similarArtists) : null,
      lfm?.listeners || 0,
      lfm?.playcount || 0
    )
    .run()

  console.log(`[detect] Created artist: ${lfm?.name || artistName} (${id})${backgroundUrl ? ' with background' : ''}`)
  return id
}

/**
 * Ensure an event record exists in the DB for the given event name.
 * Searches for an existing event first (exact match, then fuzzy LIKE).
 * If not found, auto-creates a new event record and inherits the set's cover image.
 * Returns the event ID, or null if the event name is empty.
 */
async function ensureEvent(
  eventName: string,
  setId: string,
  env: Env
): Promise<string | null> {
  if (!eventName.trim()) return null

  const name = eventName.trim()

  // 1. Exact match on name
  let existing = await env.DB.prepare(
    'SELECT id FROM events WHERE name = ?'
  ).bind(name).first<{ id: string }>()

  // 2. Fuzzy match on name or series
  if (!existing) {
    existing = await env.DB.prepare(
      'SELECT id FROM events WHERE name LIKE ? OR series LIKE ?'
    ).bind(`%${name}%`, `%${name}%`).first<{ id: string }>()
  }

  if (existing) {
    // Inherit cover image if the event doesn't have one yet
    await inheritEventCover(existing.id, setId, env)
    return existing.id
  }

  // 3. No match — create a new event record
  const id = generateId()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Extract series name: strip trailing year/edition (e.g. "Boiler Room Berlin 2024" -> "Boiler Room Berlin")
  const seriesMatch = name.match(/^(.+?)\s*(?:\d{4}|\d{1,2}(?:st|nd|rd|th)\s+edition)$/i)
  const series = seriesMatch ? seriesMatch[1].trim() : null

  await env.DB.prepare(
    `INSERT INTO events (id, name, slug, series, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(id, name, slug, series).run()

  // Inherit cover from the set
  await inheritEventCover(id, setId, env)

  console.log(`[detect] Auto-created event: ${name} (${id})${series ? ` [series: ${series}]` : ''}`)
  return id
}

/**
 * If the event has no cover image, copy the set's cover image to it.
 */
async function inheritEventCover(
  eventId: string,
  setId: string,
  env: Env
): Promise<void> {
  const eventCover = await env.DB.prepare(
    'SELECT cover_image_r2_key FROM events WHERE id = ?'
  ).bind(eventId).first<{ cover_image_r2_key: string | null }>()

  if (eventCover?.cover_image_r2_key) return

  const setCover = await env.DB.prepare(
    'SELECT cover_image_r2_key FROM sets WHERE id = ?'
  ).bind(setId).first<{ cover_image_r2_key: string | null }>()

  if (setCover?.cover_image_r2_key) {
    await env.DB.prepare('UPDATE events SET cover_image_r2_key = ? WHERE id = ?')
      .bind(setCover.cover_image_r2_key, eventId).run()
  }
}
