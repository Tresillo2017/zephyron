import { Router, corsHeaders, errorResponse } from './lib/router'
import { createAuth } from './lib/auth'
import { listSets, getSet, streamSet, debugStream, incrementPlayCount, listGenres, getSetCover } from './routes/sets'
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
  createSetFromYoutube, getUploadUrl, uploadSetAudio, createSet,
  deleteSet, updateSet,
  listPendingAnnotations, moderateAnnotation,
} from './routes/admin-beta'
import { listArtists, getArtist, syncArtist, updateArtist, deleteArtist, getArtistBackground } from './routes/artists'
import {
  getListenerCount, joinListeners, heartbeatListener, leaveListeners,
} from './routes/listeners'
import {
  searchSimilarSets, searchByTrack, indexSetRoute,
} from './routes/semantic-search'
import { getSetWaveform, regenerateWaveform } from './routes/waveform'
import { handleDetectionQueue, handleFeedbackQueue } from './queues/index'

// Re-export Durable Object class for Cloudflare runtime
export { AudioSessionDO } from './durable-objects/audio-session'

const router = new Router()

// Sets
router.get('/api/sets', listSets)
router.get('/api/sets/genres', listGenres)
router.get('/api/sets/:id', getSet)
router.get('/api/sets/:id/stream', streamSet)
router.get('/api/sets/:id/stream/debug', debugStream)
router.post('/api/sets/:id/play', incrementPlayCount)
router.get('/api/sets/:id/waveform', getSetWaveform)
router.get('/api/sets/:id/cover', getSetCover)

// Listeners (Durable Objects)
router.get('/api/sets/:id/listeners', getListenerCount)
router.post('/api/sets/:id/listeners/join', joinListeners)
router.post('/api/sets/:id/listeners/heartbeat', heartbeatListener)
router.post('/api/sets/:id/listeners/leave', leaveListeners)

// Search
router.get('/api/search', search)
router.get('/api/search/similar/:id', searchSimilarSets)
router.get('/api/search/by-track', searchByTrack)

// Detections
router.get('/api/detections/set/:setId', getDetections)
router.post('/api/detections/:id/vote', voteDetection)

// Annotations
router.post('/api/annotations', createAnnotation)
router.get('/api/annotations/set/:setId', getAnnotations)

// Artists
router.get('/api/artists', listArtists)
router.get('/api/artists/:id/background', getArtistBackground)
router.get('/api/artists/:id', getArtist)
router.post('/api/admin/artists/:id/sync', syncArtist)
router.put('/api/admin/artists/:id', updateArtist)
router.delete('/api/admin/artists/:id', deleteArtist)

// Playlists
router.get('/api/playlists', listPlaylists)
router.post('/api/playlists', createPlaylist)
router.get('/api/playlists/:id', getPlaylist)
router.put('/api/playlists/:id', updatePlaylist)
router.delete('/api/playlists/:id', deletePlaylist)
router.post('/api/playlists/:id/items', addPlaylistItem)
router.delete('/api/playlists/:id/items/:setId', removePlaylistItem)

// History
router.get('/api/history', getHistory)
router.post('/api/history', updateHistory)

// Admin / ML Pipeline
router.post('/api/admin/sets/:id/detect', triggerDetection)
router.get('/api/admin/sets/:id/detect/status', getDetectionStatus)
router.post('/api/admin/sets/:id/redetect-low', redetectLowConfidence)
router.get('/api/admin/ml/stats', mlStats)
router.post('/api/admin/ml/evolve', evolvePromptRoute)
router.get('/api/admin/jobs', listJobs)

// Admin / Beta management
router.post('/api/admin/invite-codes', generateInviteCode)
router.get('/api/admin/invite-codes', listInviteCodes)
router.delete('/api/admin/invite-codes/:id', revokeInviteCode)
router.post('/api/admin/sets/from-youtube', createSetFromYoutube)
router.post('/api/admin/sets/upload-url', getUploadUrl)
router.put('/api/admin/sets/:id/upload', uploadSetAudio)
router.post('/api/admin/sets', createSet)
router.delete('/api/admin/sets/:id', deleteSet)
router.put('/api/admin/sets/:id', updateSet)
router.get('/api/admin/annotations/pending', listPendingAnnotations)
router.post('/api/admin/annotations/:id/moderate', moderateAnnotation)
router.post('/api/admin/sets/:id/index', indexSetRoute)
router.post('/api/admin/sets/:id/waveform', regenerateWaveform)

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
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
      default:
        console.error(`Unknown queue: ${batch.queue}`)
        batch.ackAll()
    }
  },
} satisfies ExportedHandler<Env>

/**
 * Inject OG meta tags for set pages when shared on social media.
 * Crawlers (Facebook, Twitter, Slack, Discord) request the page URL
 * and parse <meta> tags from the HTML.
 */
async function handleOgMetaTags(url: URL, env: Env): Promise<Response> {
  // Extract set ID from path
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

    // Return an HTML page with OG meta tags
    // The SPA will load and take over for real users
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
