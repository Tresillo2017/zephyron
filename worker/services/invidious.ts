// Invidious API client
// Replaces YouTube Data API v3 for video metadata, comments, and audio stream resolution.
// Configured via INVIDIOUS_BASE_URL environment variable.

import { extractVideoId } from './youtube'

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface InvidiousVideoData {
  videoId: string
  title: string
  description: string
  author: string
  authorId: string
  lengthSeconds: number
  published: number // Unix epoch
  publishedText: string
  keywords: string[]
  viewCount: number
  likeCount: number
  genre: string
  videoThumbnails: InvidiousThumbnail[]
  storyboards: InvidiousStoryboard[]
  adaptiveFormats: InvidiousAdaptiveFormat[]
  musicTracks: InvidiousMusicTrack[]
}

export interface InvidiousThumbnail {
  quality: string
  url: string
  width: number
  height: number
}

export interface InvidiousStoryboard {
  url: string
  templateUrl: string
  width: number
  height: number
  count: number
  interval: number
  storyboardWidth: number
  storyboardHeight: number
  storyboardCount: number
}

export interface InvidiousAdaptiveFormat {
  index: string
  bitrate: string
  init: string
  url: string
  itag: string
  type: string
  clen: string
  lmt: string
  projectionType: string
  container: string
  encoding: string
  qualityLabel?: string
  resolution?: string
  fps: number
  size?: string
  audioQuality?: string
  audioSampleRate?: string
  audioChannels?: string
}

export interface InvidiousMusicTrack {
  song: string
  artist: string
  album: string
  license: string
}

export interface InvidiousComment {
  author: string
  authorId: string
  content: string
  contentHtml: string
  published: number
  publishedText: string
  likeCount: number
  commentId: string
  authorIsChannelOwner: boolean
  isPinned: boolean
  replies?: {
    replyCount: number
    continuation: string
  }
}

export interface InvidiousCommentsResponse {
  commentCount?: number
  videoId: string
  comments: InvidiousComment[]
  continuation?: string
}

export interface AudioStreamInfo {
  url: string
  itag: string
  type: string
  bitrate: string
  container: string
  encoding: string
  audioQuality: string
  audioSampleRate?: string
  audioChannels?: string
}

// ═══════════════════════════════════════════
// API Client
// ═══════════════════════════════════════════

function getBaseUrl(env: Env): string {
  const url = env.INVIDIOUS_BASE_URL
  if (!url) throw new Error('INVIDIOUS_BASE_URL is not configured')
  // Strip trailing slash
  return url.replace(/\/+$/, '')
}

/**
 * Fetch full video data from Invidious API.
 * Returns rich metadata including description, thumbnails, storyboards,
 * adaptive formats (for audio streaming), and musicTracks.
 *
 * @param local - If true, adaptiveFormats URLs point to the Invidious instance
 *                (proxied) instead of googlevideo.com. Required for streaming
 *                from Cloudflare Workers since googlevideo.com blocks non-browser IPs.
 */
export async function fetchVideoData(
  videoId: string,
  env: Env,
  local = false
): Promise<InvidiousVideoData> {
  const baseUrl = getBaseUrl(env)
  const url = `${baseUrl}/api/v1/videos/${videoId}${local ? '?local=true' : ''}`

  const resp = await fetch(url)
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Invidious API error ${resp.status}: ${text.slice(0, 200)}`)
  }

  const data = await resp.json() as Record<string, unknown>

  return {
    videoId: String(data.videoId || videoId),
    title: String(data.title || ''),
    description: String(data.description || ''),
    author: String(data.author || ''),
    authorId: String(data.authorId || ''),
    lengthSeconds: Number(data.lengthSeconds) || 0,
    published: Number(data.published) || 0,
    publishedText: String(data.publishedText || ''),
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    viewCount: Number(data.viewCount) || 0,
    likeCount: Number(data.likeCount) || 0,
    genre: String(data.genre || ''),
    videoThumbnails: Array.isArray(data.videoThumbnails)
      ? (data.videoThumbnails as InvidiousThumbnail[])
      : [],
    storyboards: Array.isArray(data.storyboards)
      ? (data.storyboards as InvidiousStoryboard[])
      : [],
    adaptiveFormats: Array.isArray(data.adaptiveFormats)
      ? (data.adaptiveFormats as InvidiousAdaptiveFormat[])
      : [],
    musicTracks: Array.isArray(data.musicTracks)
      ? (data.musicTracks as InvidiousMusicTrack[])
      : [],
  }
}

/**
 * Fetch comments from Invidious API, filtered for tracklist-relevant content.
 * Uses continuation tokens for pagination (up to maxPages).
 */
export async function fetchRelevantComments(
  videoId: string,
  env: Env,
  maxPages = 3
): Promise<string[]> {
  const baseUrl = getBaseUrl(env)
  const allComments: InvidiousComment[] = []
  let continuation: string | undefined

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ sort_by: 'top' })
    if (continuation) params.set('continuation', continuation)

    const url = `${baseUrl}/api/v1/comments/${videoId}?${params}`

    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        console.error(`[invidious-comments] API error: ${resp.status}`)
        break
      }

      const data = await resp.json() as InvidiousCommentsResponse
      if (!data.comments || data.comments.length === 0) break

      allComments.push(...data.comments)
      continuation = data.continuation || undefined
      if (!continuation) break
    } catch (err) {
      console.error('[invidious-comments] Fetch error:', err)
      break
    }
  }

  return filterTracklistComments(allComments.map((c) => c.content))
}

/**
 * Resolve the best audio-only stream URL from Invidious adaptive formats.
 * Uses local=true so URLs point to the Invidious proxy (not googlevideo.com).
 * Prefers highest bitrate audio stream (opus > mp4a).
 */
export async function getBestAudioStream(
  videoId: string,
  env: Env
): Promise<AudioStreamInfo> {
  const videoData = await fetchVideoData(videoId, env, true)
  const baseUrl = getBaseUrl(env)

  // Filter for audio-only adaptive formats
  const audioFormats = videoData.adaptiveFormats.filter(
    (f) => f.type.startsWith('audio/')
  )

  if (audioFormats.length === 0) {
    throw new Error(`No audio streams available for video ${videoId}`)
  }

  // Sort by bitrate (descending) — prefer higher quality
  // Prefer opus for better quality-to-size ratio, fall back to mp4a
  audioFormats.sort((a, b) => {
    const bitrateA = parseInt(a.bitrate) || 0
    const bitrateB = parseInt(b.bitrate) || 0
    // Boost opus formats slightly in comparison
    const boostA = a.encoding?.toLowerCase().includes('opus') ? 1.1 : 1
    const boostB = b.encoding?.toLowerCase().includes('opus') ? 1.1 : 1
    return (bitrateB * boostB) - (bitrateA * boostA)
  })

  const best = audioFormats[0]

  // Fix the URL: Invidious local=true may return URLs with a non-standard port
  // (e.g. :3000) that isn't accessible externally. Replace with the base URL's host.
  let streamUrl = best.url
  try {
    const parsed = new URL(streamUrl)
    const base = new URL(baseUrl)
    // If the URL points to the Invidious host but with a different port, fix it
    if (parsed.hostname === base.hostname || parsed.hostname.includes('invidious')) {
      parsed.protocol = base.protocol
      parsed.hostname = base.hostname
      parsed.port = base.port || ''
      streamUrl = parsed.toString()
    }
  } catch {
    // URL parsing failed, use as-is
  }

  return {
    url: streamUrl,
    itag: best.itag,
    type: best.type,
    bitrate: best.bitrate,
    container: best.container,
    encoding: best.encoding,
    audioQuality: best.audioQuality || 'unknown',
    audioSampleRate: best.audioSampleRate,
    audioChannels: best.audioChannels,
  }
}

/**
 * Get the best thumbnail URL from Invidious video data.
 * Prefers maxres > high > medium > default quality.
 */
export function getBestThumbnail(thumbnails: InvidiousThumbnail[]): string | null {
  if (!thumbnails || thumbnails.length === 0) return null

  // Quality preference order
  const qualityOrder = ['maxres', 'maxresdefault', 'sddefault', 'high', 'medium', 'default']

  for (const quality of qualityOrder) {
    const thumb = thumbnails.find((t) => t.quality === quality)
    if (thumb) return thumb.url
  }

  // Fallback: pick the largest by width
  const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))
  return sorted[0]?.url || null
}

/**
 * Get storyboard data from Invidious video data.
 * Returns the best storyboard configuration for the scrubber.
 */
export function getStoryboardData(storyboards: InvidiousStoryboard[]): InvidiousStoryboard | null {
  if (!storyboards || storyboards.length === 0) return null

  // Prefer medium-sized storyboards (not too small, not too large)
  // Typically the second storyboard is the best for scrubbing (larger thumbnails)
  // The last one usually has the smallest interval and most frames
  return storyboards.length > 1
    ? storyboards[storyboards.length - 1]
    : storyboards[0]
}

// ═══════════════════════════════════════════
// Comment filtering (ported from youtube-comments.ts)
// ═══════════════════════════════════════════

/**
 * Filter comments to only include those that contain track identification data.
 *
 * INCLUDE:
 * - Comments with 3+ timestamps (likely a tracklist)
 * - Comments with "tracklist" / "track list" / "setlist" keyword
 * - Comments with a timestamp followed by "Artist - Title" pattern
 *
 * EXCLUDE:
 * - Reaction comments with a single timestamp ("24:21 BANGERRR", "36:15 is pure magic")
 */
function filterTracklistComments(comments: string[]): string[] {
  const results: { comment: string; score: number }[] = []

  for (const comment of comments) {
    const timestamps = comment.match(/\d{1,2}:\d{2}/g) || []

    // Category 1: Full tracklist (3+ timestamps)
    if (timestamps.length >= 3) {
      results.push({ comment, score: 100 + timestamps.length })
      continue
    }

    // Category 2: Tracklist keyword
    if (/tracklist|track\s?list|song\s?list|set\s?list/i.test(comment)) {
      results.push({ comment, score: 80 })
      continue
    }

    // Category 3: Single timestamp with a clear "Artist - Title" identification
    if (timestamps.length >= 1) {
      const hasTrackPattern = /\d{1,2}:\d{2}\s*[-–—]\s*\S/.test(comment)
        || /\d{1,2}:\d{2}\s+\w+\s*[-–—]\s*\w+/.test(comment)
        || /(?:track|song|ID)\s+(?:at\s+)?\d{1,2}:\d{2}\s+is/i.test(comment)

      if (hasTrackPattern) {
        results.push({ comment, score: 30 })
        continue
      }

      // Reject single-timestamp reaction comments
      continue
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .map((r) => r.comment)
}

/**
 * Helper: fetch video data from a YouTube URL (extracts video ID first).
 */
export async function fetchVideoDataFromUrl(
  url: string,
  env: Env
): Promise<InvidiousVideoData> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('Could not extract video ID from URL')
  }
  return fetchVideoData(videoId, env)
}
