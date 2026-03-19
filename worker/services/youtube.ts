// YouTube Data API v3 client + URL parser
// Fetches full video metadata including description, tags, duration

export interface YouTubeVideoData {
  videoId: string
  title: string
  description: string
  channelTitle: string
  tags: string[]
  publishedAt: string
  durationSeconds: number
  thumbnailUrl: string
  /** Whether this came from the full API or the oEmbed fallback */
  source: 'youtube_api' | 'oembed'
}

/**
 * Extract a YouTube video ID from various URL formats.
 *
 * Supports:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ
 *   https://youtube.com/embed/dQw4w9WgXcQ
 *   https://youtube.com/shorts/dQw4w9WgXcQ
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=...
 *   https://music.youtube.com/watch?v=dQw4w9WgXcQ
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    const hostname = parsed.hostname.replace('www.', '').replace('music.', '')

    if (hostname === 'youtube.com') {
      // /watch?v=ID
      const v = parsed.searchParams.get('v')
      if (v) return v

      // /embed/ID or /shorts/ID or /v/ID
      const pathMatch = parsed.pathname.match(/^\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/)
      if (pathMatch) return pathMatch[2]

      // /live/ID
      const liveMatch = parsed.pathname.match(/^\/live\/([a-zA-Z0-9_-]{11})/)
      if (liveMatch) return liveMatch[1]
    }

    if (hostname === 'youtu.be') {
      // youtu.be/ID
      const id = parsed.pathname.slice(1).split('/')[0]
      if (id && id.length === 11) return id
    }
  } catch {
    // Not a valid URL
  }

  // Last resort: try to find an 11-char ID pattern
  const fallbackMatch = url.match(/[a-zA-Z0-9_-]{11}/)
  return fallbackMatch ? fallbackMatch[0] : null
}

/**
 * Parse ISO 8601 duration (PT1H23M45S) to seconds.
 */
function parseDuration(iso8601: string): number {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Fetch full video data from YouTube Data API v3.
 * Falls back to oEmbed if no API key is provided.
 */
export async function fetchVideoData(
  videoId: string,
  apiKey: string | undefined,
  originalUrl: string
): Promise<YouTubeVideoData> {
  // If we have an API key, use the full YouTube Data API
  if (apiKey) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`

    const resp = await fetch(apiUrl)
    if (resp.ok) {
      const data = await resp.json() as {
        items?: Array<{
          snippet: {
            title: string
            description: string
            channelTitle: string
            tags?: string[]
            publishedAt: string
            thumbnails: {
              maxres?: { url: string }
              high?: { url: string }
              medium?: { url: string }
              default?: { url: string }
            }
          }
          contentDetails: {
            duration: string
          }
        }>
      }

      if (data.items && data.items.length > 0) {
        const item = data.items[0]
        const thumbnails = item.snippet.thumbnails
        const thumbnailUrl =
          thumbnails.maxres?.url ||
          thumbnails.high?.url ||
          thumbnails.medium?.url ||
          thumbnails.default?.url ||
          ''

        return {
          videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          tags: item.snippet.tags || [],
          publishedAt: item.snippet.publishedAt,
          durationSeconds: parseDuration(item.contentDetails.duration),
          thumbnailUrl,
          source: 'youtube_api',
        }
      }
    }
    // API call failed — fall through to oEmbed
    console.error('YouTube Data API failed, falling back to oEmbed')
  }

  // Fallback: oEmbed (no API key needed, but limited data)
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(originalUrl)}&format=json`
  const oembedResp = await fetch(oembedUrl)

  if (!oembedResp.ok) {
    throw new Error('Could not fetch YouTube data. Check the URL.')
  }

  const oembed = await oembedResp.json() as {
    title: string
    author_name: string
    thumbnail_url: string
  }

  return {
    videoId,
    title: oembed.title || '',
    description: '',
    channelTitle: oembed.author_name || '',
    tags: [],
    publishedAt: '',
    durationSeconds: 0,
    thumbnailUrl: oembed.thumbnail_url || '',
    source: 'oembed',
  }
}
