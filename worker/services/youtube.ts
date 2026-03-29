// YouTube URL parser
// Extracts video IDs from various YouTube URL formats.
// The actual data fetching is now handled by the Invidious client (invidious.ts).

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
