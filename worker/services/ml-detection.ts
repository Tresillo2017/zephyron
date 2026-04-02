// ML Detection Pipeline v3 — 1001Tracklists + Invidious + Songs
// Primary source: 1001tracklists.com (via Browser Rendering)
// Fallback: YouTube description + comments via Invidious API + LLM
// All tracks are linked to first-class Song records.

import { generateId } from '../lib/id'
import { extractVideoId } from './youtube'
import { fetchVideoData, fetchRelevantComments, getBestVideoStream, type InvidiousVideoData } from './invidious'
import { parseTracklist, type ParsedTrack } from './tracklist-parser'
import { lookupArtist } from './lastfm'
import { fetch1001Tracklist, type Track1001 } from './tracklists-1001'
import { findOrCreateSong } from './songs'

/**
 * Run the full detection pipeline for a DJ set.
 *
 * Flow:
 * 1. If tracklist_1001_url is set: fetch from 1001tracklists.com (BR → HTML fallback)
 * 2. If no 1001tracklists data: fetch YouTube description + comments via Invidious
 * 3. For each track: find-or-create a Song record
 * 4. Enrich songs with Last.fm data
 * 5. Cache song cover art to R2
 * 6. Create/update artist record
 * 7. Auto-link to events
 * 8. Resolve and store YouTube video stream URL
 * 9. Write detections to D1
 */
export async function runDetectionPipeline(
  setId: string,
  env: Env
): Promise<{ detections: number; artist_id?: string; error?: string }> {
  // 1. Fetch set metadata
  const set = await env.DB.prepare(
    `SELECT id, title, artist, source_url, youtube_video_id, genre, event,
            duration_seconds, tracklist_1001_url, tracklist_1001_id
     FROM sets WHERE id = ?`
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
      tracklist_1001_url: string | null
      tracklist_1001_id: string | null
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

    // ─── Phase 1: Get tracks from best available source ───

    let tracks1001: Track1001[] = []
    let parsedTracks: ParsedTrack[] = []
    let detectionMethod = 'youtube_tracklist'
    let confidence = 0.85

    // Try 1001tracklists first (highest quality data)
    if (set.tracklist_1001_url) {
      console.log(`[detect] Fetching 1001tracklists: ${set.tracklist_1001_url}`)
      const result = await fetch1001Tracklist(set.tracklist_1001_url)

      if (result.tracks.length > 0) {
        tracks1001 = result.tracks
        detectionMethod = '1001tracklists'
        confidence = 0.98 // Community-verified data
        console.log(`[detect] Got ${tracks1001.length} tracks from 1001tracklists (${result.source})`)
      } else if (result.error) {
        console.warn(`[detect] 1001tracklists failed: ${result.error}`)
      }
    }

    // Fall back to Invidious if no 1001tracklists data
    if (tracks1001.length === 0) {
      const videoId = set.youtube_video_id || (set.source_url ? extractVideoId(set.source_url) : null)

      if (videoId) {
        console.log(`[detect] Fetching Invidious data for video ${videoId}`)

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

        // Fetch comments
        const comments = await fetchRelevantComments(videoId, env, 2)
        console.log(`[detect] Found ${comments.length} relevant comments`)

        // Use musicTracks from Invidious as additional hint
        let musicTracksText = ''
        if (videoData.musicTracks.length > 0) {
          musicTracksText = videoData.musicTracks
            .map((t, i) => `${i + 1}. ${t.artist} - ${t.song}${t.album ? ` [${t.album}]` : ''}`)
            .join('\n')
          console.log(`[detect] Found ${videoData.musicTracks.length} musicTracks from Invidious`)
        }

        const combinedDescription = musicTracksText
          ? `${videoData.description}\n\n--- YouTube Music Tracks ---\n${musicTracksText}`
          : videoData.description

        parsedTracks = await parseTracklist(combinedDescription, comments, env)
        console.log(`[detect] Parsed ${parsedTracks.length} tracks from Invidious data`)
      }
    }

    // No tracks from any source
    if (tracks1001.length === 0 && parsedTracks.length === 0) {
      await env.DB.prepare(
        "UPDATE sets SET detection_status = 'complete', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(setId).run()
      return { detections: 0 }
    }

    // ─── Phase 2: Clear old detections ───

    await env.DB.prepare('DELETE FROM detections WHERE set_id = ?').bind(setId).run()

    // ─── Phase 3: Process tracks → Song records + Detection records ───

    let insertedCount = 0
    let enrichedCount = 0

    if (tracks1001.length > 0) {
      // Process 1001tracklists data (rich metadata with links)
      for (const track of tracks1001) {
        const detectionId = generateId()

        // Find or create a Song record
        const songId = await findOrCreateSong({
          title: track.title,
          artist: track.artist,
          label: track.label,
          cover_art_url: track.artwork_url,
          spotify_url: track.spotify_url,
          apple_music_url: track.apple_music_url,
          soundcloud_url: track.soundcloud_url,
          beatport_url: track.beatport_url,
          youtube_url: track.youtube_url,
          deezer_url: track.deezer_url,
          bandcamp_url: track.bandcamp_url,
          traxsource_url: track.traxsource_url,
          source: '1001tracklists',
        }, env)

        // Queue enrichment + cover art via Cloudflare Queue
        try {
          if (lastfmKey) {
            await env.COVER_ART_QUEUE.send({ type: 'enrich_lastfm', song_id: songId, artist: track.artist, title: track.title })
            enrichedCount++
          }
          if (track.artwork_url) {
            await env.COVER_ART_QUEUE.send({ type: 'cache_cover_art', song_id: songId, image_url: track.artwork_url })
          }
        } catch {
          // Queue send failed — non-blocking
        }

        // Calculate start/end times
        const startTime = track.start_seconds ?? 0
        const trackIndex = tracks1001.indexOf(track)
        const endTime = trackIndex + 1 < tracks1001.length
          ? (tracks1001[trackIndex + 1].start_seconds ?? set.duration_seconds)
          : set.duration_seconds

        // Insert detection linked to song
        await env.DB.prepare(
          `INSERT INTO detections (
            id, set_id, track_title, track_artist, start_time_seconds, end_time_seconds,
            confidence, detection_method, song_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          detectionId, setId,
          track.title, track.artist || null,
          startTime, endTime,
          confidence, detectionMethod,
          songId,
        ).run()

        insertedCount++
      }
    } else {
      // Process Invidious-parsed tracks (standard pipeline)
      for (const track of parsedTracks) {
        const detectionId = generateId()

        // Find or create a Song record
        const songId = await findOrCreateSong({
          title: track.title,
          artist: track.artist || '',
          source: 'youtube',
        }, env)

        // Queue enrichment + cover art
        try {
          if (lastfmKey && track.title) {
            await env.COVER_ART_QUEUE.send({ type: 'enrich_lastfm', song_id: songId, artist: track.artist || '', title: track.title })
            enrichedCount++
          }
          await env.COVER_ART_QUEUE.send({ type: 'cache_cover_art', song_id: songId })
        } catch {
          // Non-blocking
        }

        // Calculate end time
        const trackIndex = parsedTracks.indexOf(track)
        const endTime = trackIndex + 1 < parsedTracks.length
          ? parsedTracks[trackIndex + 1].start_seconds
          : set.duration_seconds

        const trackConfidence = track.source === 'regex' ? 0.85 : 0.95
        const trackMethod = track.source === 'regex' ? 'youtube_regex' : 'youtube_tracklist'

        await env.DB.prepare(
          `INSERT INTO detections (
            id, set_id, track_title, track_artist, start_time_seconds, end_time_seconds,
            confidence, detection_method, song_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          detectionId, setId,
          track.title, track.artist || null,
          track.start_seconds, endTime,
          trackConfidence, trackMethod,
          songId,
        ).run()

        insertedCount++
      }
    }

    console.log(`[detect] Inserted ${insertedCount} detections (${enrichedCount} enriched with Last.fm)`)

    // ─── Phase 4: Artist + Event auto-creation ───

    let artistId: string | undefined
    if (lastfmKey && set.artist) {
      artistId = (await ensureArtist(set.artist, lastfmKey, setId, env)) ?? undefined
      if (artistId) {
        await env.DB.prepare('UPDATE sets SET artist_id = ? WHERE id = ?')
          .bind(artistId, setId).run()
      }
    }

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

    // ─── Phase 5: Store YouTube video stream URL ───

    const videoId = set.youtube_video_id || (set.source_url ? extractVideoId(set.source_url) : null)
    if (videoId) {
      try {
        const videoStream = await getBestVideoStream(videoId, env)
        // Stream URLs expire in ~6 hours
        const expiresAt = Math.floor(Date.now() / 1000) + (6 * 3600)
        await env.DB.prepare(
          `UPDATE sets SET youtube_video_stream_url = ?, youtube_video_stream_expires = ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(videoStream.url, expiresAt, setId).run()
        console.log(`[detect] Stored video stream URL (${videoStream.qualityLabel})`)
      } catch (err) {
        console.warn('[detect] Video stream resolution failed (non-blocking):', err)
      }
    }

    // ─── Phase 6: Mark complete ───

    await env.DB.prepare(
      "UPDATE sets SET detection_status = 'complete', detection_version = detection_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(setId).run()

    return { detections: insertedCount, artist_id: artistId }
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
 */
async function ensureArtist(
  artistName: string,
  lastfmKey: string,
  setId: string,
  env: Env
): Promise<string | null> {
  const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const existing = await env.DB.prepare(
    'SELECT id FROM artists WHERE slug = ? OR name = ?'
  ).bind(slug, artistName).first<{ id: string }>()

  if (existing) return existing.id

  const lfm = await lookupArtist(artistName, lastfmKey)

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

  let backgroundUrl: string | null = null
  try {
    const setCover = await env.DB.prepare(
      'SELECT cover_image_r2_key FROM sets WHERE id = ?'
    ).bind(setId).first<{ cover_image_r2_key: string | null }>()

    if (setCover?.cover_image_r2_key) {
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
 */
async function ensureEvent(
  eventName: string,
  setId: string,
  env: Env
): Promise<string | null> {
  if (!eventName.trim()) return null

  const name = eventName.trim()

  let existing = await env.DB.prepare(
    'SELECT id FROM events WHERE name = ?'
  ).bind(name).first<{ id: string }>()

  if (!existing) {
    existing = await env.DB.prepare(
      'SELECT id FROM events WHERE name LIKE ? OR series LIKE ?'
    ).bind(`%${name}%`, `%${name}%`).first<{ id: string }>()
  }

  if (existing) {
    await inheritEventCover(existing.id, setId, env)
    return existing.id
  }

  const id = generateId()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const seriesMatch = name.match(/^(.+?)\s*(?:\d{4}|\d{1,2}(?:st|nd|rd|th)\s+edition)$/i)
  const series = seriesMatch ? seriesMatch[1].trim() : null

  // Extract year from event name
  const yearMatch = name.match(/\b(20\d{2})\b/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null

  await env.DB.prepare(
    `INSERT INTO events (id, name, slug, series, year, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(id, name, slug, series, year).run()

  await inheritEventCover(id, setId, env)

  console.log(`[detect] Auto-created event: ${name} (${id})${series ? ` [series: ${series}]` : ''}`)
  return id
}

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
