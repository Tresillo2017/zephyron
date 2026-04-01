import { Router, corsHeaders, errorResponse, json } from './lib/router'
import { createAuth, requireAdmin, requireAuth } from './lib/auth'
import { listSets, getSet, streamSet, getStreamUrl, getStoryboard, debugStream, incrementPlayCount, listGenres, getSetCover, getSetVideo } from './routes/sets'
import { search } from './routes/search'
import { getHistory, updateHistory } from './routes/history'
import { getDetections, voteDetection, createAnnotation, getAnnotations } from './routes/detections'
import {
  listPlaylists, createPlaylist, getPlaylist, updatePlaylist,
  deletePlaylist, addPlaylistItem, removePlaylistItem,
} from './routes/playlists'
import {
  triggerDetection, getDetectionStatus, mlStats,
  evolvePromptRoute, listJobs, redetectLowConfidence,
} from './routes/admin'
import {
  generateInviteCode, listInviteCodes, revokeInviteCode,
  createSetFromYoutube, createSet,
  deleteSet, updateSet,
  listPendingAnnotations, moderateAnnotation,
  fetch1001Tracklists, parse1001TracklistsHtml, import1001Tracklists, getVideoStreamUrl,
} from './routes/admin-beta'
import { listArtists, getArtist, syncArtist, updateArtist, deleteArtist, getArtistBackground } from './routes/artists'
import {
  getListenerCount, joinListeners, heartbeatListener, leaveListeners,
} from './routes/listeners'
import {
  searchSimilarSets, searchByTrack, indexSetRoute,
} from './routes/semantic-search'
import { getSetWaveform, regenerateWaveform } from './routes/waveform'
import {
  listEvents, getEvent, getEventCover, getEventLogo,
  createEvent, updateEvent, deleteEvent, uploadEventCover, uploadEventLogo, linkSetToEvent, unlinkSetFromEvent,
} from './routes/events'
import { submitSetRequest } from './routes/petitions'
import { getSong, getSongCover, listSongsAdmin, updateSongAdmin, deleteSongAdmin, cacheSongCoverAdmin, enrichSongAdmin } from './routes/songs'
import { handleDetectionQueue, handleFeedbackQueue, handleCoverArtQueue } from './queues/index'

// Re-export Durable Object class for Cloudflare runtime
export { AudioSessionDO } from './durable-objects/audio-session'

// ═══════════════════════════════════════════
// Admin route wrapper — validates session + admin role
// ═══════════════════════════════════════════

type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<Response> | Response

function withAdmin(handler: RouteHandler): RouteHandler {
  return async (request, env, ctx, params) => {
    const result = await requireAdmin(request, env)
    if (result instanceof Response) return result
    return handler(request, env, ctx, params)
  }
}

function withAuth(handler: RouteHandler): RouteHandler {
  return async (request, env, ctx, params) => {
    const result = await requireAuth(request, env)
    if (result instanceof Response) return result
    return handler(request, env, ctx, params)
  }
}

// ═══════════════════════════════════════════
// Router setup
// ═══════════════════════════════════════════

const router = new Router()

// Health check
router.get('/api/health', () => json({ status: 'ok', version: '0.3.0-alpha' }))

// Sets (public)
router.get('/api/sets', listSets)
router.get('/api/sets/genres', listGenres)
router.get('/api/sets/:id', getSet)
router.get('/api/sets/:id/stream', streamSet)
router.get('/api/sets/:id/stream-url', getStreamUrl)
router.get('/api/sets/:id/stream/debug', debugStream)
router.get('/api/sets/:id/storyboard', getStoryboard)
router.post('/api/sets/:id/play', incrementPlayCount)
router.get('/api/sets/:id/waveform', getSetWaveform)
router.get('/api/sets/:id/cover', getSetCover)
router.get('/api/sets/:id/video', getSetVideo)

// Songs (public read)
router.get('/api/songs/:id/cover', getSongCover)
router.get('/api/songs/:id', getSong)

// Admin: Songs
router.get('/api/admin/songs', withAdmin(listSongsAdmin))
router.put('/api/admin/songs/:id', withAdmin(updateSongAdmin))
router.delete('/api/admin/songs/:id', withAdmin(deleteSongAdmin))
router.post('/api/admin/songs/:id/cache-cover', withAdmin(cacheSongCoverAdmin))
router.post('/api/admin/songs/:id/enrich', withAdmin(enrichSongAdmin))

// Listeners (Durable Objects)
router.get('/api/sets/:id/listeners', getListenerCount)
router.post('/api/sets/:id/listeners/join', joinListeners)
router.post('/api/sets/:id/listeners/heartbeat', heartbeatListener)
router.post('/api/sets/:id/listeners/leave', leaveListeners)

// Search (public)
router.get('/api/search', search)
router.get('/api/search/similar/:id', searchSimilarSets)
router.get('/api/search/by-track', searchByTrack)

// Detections (public read, voting needs anonymous ID)
router.get('/api/detections/set/:setId', getDetections)
router.post('/api/detections/:id/vote', voteDetection)

// Annotations
router.post('/api/annotations', createAnnotation)
router.get('/api/annotations/set/:setId', getAnnotations)

// Artists (public read)
router.get('/api/artists', listArtists)
router.get('/api/artists/:id/background', getArtistBackground)
router.get('/api/artists/:id', getArtist)

// Events (public read)
router.get('/api/events', listEvents)
router.get('/api/events/:id/cover', getEventCover)
router.get('/api/events/:id/logo', getEventLogo)
router.get('/api/events/:id', getEvent)

// Playlists (authenticated)
router.get('/api/playlists', listPlaylists)
router.post('/api/playlists', createPlaylist)
router.get('/api/playlists/:id', getPlaylist)
router.put('/api/playlists/:id', updatePlaylist)
router.delete('/api/playlists/:id', deletePlaylist)
router.post('/api/playlists/:id/items', addPlaylistItem)
router.delete('/api/playlists/:id/items/:setId', removePlaylistItem)

// History (authenticated)
router.get('/api/history', getHistory)
router.post('/api/history', updateHistory)

// Set request petitions (authenticated + Turnstile)
router.post('/api/petitions', withAuth(submitSetRequest))

// ═══════════════════════════════════════════
// Admin routes — all protected by withAdmin()
// ═══════════════════════════════════════════

// Admin / Artists
router.post('/api/admin/artists/:id/sync', withAdmin(syncArtist))
router.put('/api/admin/artists/:id', withAdmin(updateArtist))
router.delete('/api/admin/artists/:id', withAdmin(deleteArtist))

// Admin / Events
router.post('/api/admin/events', withAdmin(createEvent))
router.put('/api/admin/events/:id', withAdmin(updateEvent))
router.delete('/api/admin/events/:id', withAdmin(deleteEvent))
router.put('/api/admin/events/:id/cover', withAdmin(uploadEventCover))
router.put('/api/admin/events/:id/logo', withAdmin(uploadEventLogo))
router.post('/api/admin/events/:id/link-set', withAdmin(linkSetToEvent))
router.post('/api/admin/events/:id/unlink-set', withAdmin(unlinkSetFromEvent))

// Admin / ML Pipeline
router.post('/api/admin/sets/:id/detect', withAdmin(triggerDetection))
router.get('/api/admin/sets/:id/detect/status', withAdmin(getDetectionStatus))
router.post('/api/admin/sets/:id/redetect-low', withAdmin(redetectLowConfidence))
router.get('/api/admin/ml/stats', withAdmin(mlStats))
router.post('/api/admin/ml/evolve', withAdmin(evolvePromptRoute))
router.get('/api/admin/jobs', withAdmin(listJobs))

// Admin / Beta management
router.post('/api/admin/invite-codes', withAdmin(generateInviteCode))
router.get('/api/admin/invite-codes', withAdmin(listInviteCodes))
router.delete('/api/admin/invite-codes/:id', withAdmin(revokeInviteCode))
router.post('/api/admin/sets/from-youtube', withAdmin(createSetFromYoutube))
router.post('/api/admin/sets', withAdmin(createSet))
router.delete('/api/admin/sets/:id', withAdmin(deleteSet))
router.put('/api/admin/sets/:id', withAdmin(updateSet))
router.get('/api/admin/annotations/pending', withAdmin(listPendingAnnotations))
router.post('/api/admin/annotations/:id/moderate', withAdmin(moderateAnnotation))
router.post('/api/admin/sets/:id/index', withAdmin(indexSetRoute))
router.post('/api/admin/sets/:id/waveform', withAdmin(regenerateWaveform))
router.post('/api/admin/sets/:id/fetch-1001tracklists', withAdmin(fetch1001Tracklists))
router.post('/api/admin/sets/:id/parse-1001tracklists-html', withAdmin(parse1001TracklistsHtml))
router.post('/api/admin/sets/:id/import-1001tracklists', withAdmin(import1001Tracklists))
router.get('/api/sets/:id/video-stream-url', getVideoStreamUrl)

// ═══════════════════════════════════════════
// Worker export
// ═══════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request.headers.get('Origin')) })
    }

    const url = new URL(request.url)

    // Only handle /api/ routes
    if (!url.pathname.startsWith('/api/')) {
      // OG meta tags for shared set links (social previews)
      if (url.pathname.match(/^\/app\/sets\/[^/]+$/)) {
        return handleOgMetaTags(url, env)
      }
      return new Response(null, { status: 404 })
    }

    // Better Auth handles /api/auth/* routes
    if (url.pathname.startsWith('/api/auth')) {
      const auth = createAuth(env)
      return auth.handler(request)
    }

    try {
      const response = await router.handle(request, env, ctx)
      if (response) return response
      return errorResponse('Not found', 404)
    } catch (err) {
      console.error('API Error:', err)
      const message = err instanceof Error ? err.message : 'Internal server error'
      return errorResponse(message, 500)
    }
  },

  async queue(batch, env) {
    switch (batch.queue) {
      case 'ml-detection-queue':
        await handleDetectionQueue(batch as MessageBatch<any>, env)
        break
      case 'feedback-queue':
        await handleFeedbackQueue(batch as MessageBatch<any>, env)
        break
      case 'cover-art-queue':
        await handleCoverArtQueue(batch as MessageBatch<any>, env)
        break
      default:
        console.error(`Unknown queue: ${batch.queue}`)
        batch.ackAll()
    }
  },
} satisfies ExportedHandler<Env>

/**
 * Inject OG meta tags for set pages when shared on social media.
 */
async function handleOgMetaTags(url: URL, env: Env): Promise<Response> {
  const match = url.pathname.match(/^\/app\/sets\/([^/]+)$/)
  if (!match) return new Response(null, { status: 404 })

  const setId = match[1]

  try {
    const set = await env.DB.prepare(
      'SELECT title, artist, genre, venue, event, duration_seconds, description FROM sets WHERE id = ?'
    )
      .bind(setId)
      .first<{ title: string; artist: string; genre: string | null; venue: string | null; event: string | null; duration_seconds: number; description: string | null }>()

    if (!set) return new Response(null, { status: 404 })

    const durationMin = Math.round(set.duration_seconds / 60)
    const description = set.description
      || `${set.artist} DJ set${set.venue ? ` at ${set.venue}` : ''}${set.event ? ` - ${set.event}` : ''} (${durationMin} min)`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(set.title)} - ${escapeHtml(set.artist)} | Zephyron</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(set.title)} - ${escapeHtml(set.artist)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="music.song" />
  <meta property="og:url" content="${url.origin}/app/sets/${setId}" />
  <meta property="og:site_name" content="Zephyron" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(set.title)} - ${escapeHtml(set.artist)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta http-equiv="refresh" content="0;url=${url.origin}/app/sets/${setId}" />
</head>
<body></body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
