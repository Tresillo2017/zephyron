// YouTube Comments fetcher
// Fetches top comments from a YouTube video, filtered for tracklist-relevant content

import { extractVideoId } from './youtube'

/**
 * Fetch comments from a YouTube video that are likely to contain track information.
 * Returns plain text comment strings, filtered for relevance.
 */
export async function fetchRelevantComments(
  videoUrl: string,
  apiKey: string,
  maxPages = 3
): Promise<string[]> {
  const videoId = extractVideoId(videoUrl)
  if (!videoId) return []

  const allComments: string[] = []
  let pageToken: string | undefined

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      videoId,
      part: 'snippet',
      maxResults: '100',
      order: 'relevance',
      textFormat: 'plainText',
      key: apiKey,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const url = `https://www.googleapis.com/youtube/v3/commentThreads?${params}`

    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        console.error(`[youtube-comments] API error: ${resp.status}`)
        break
      }

      const data = await resp.json() as {
        items?: Array<{
          snippet: {
            topLevelComment: {
              snippet: {
                textDisplay: string
              }
            }
          }
        }>
        nextPageToken?: string
      }

      if (!data.items) break

      for (const item of data.items) {
        const text = item.snippet.topLevelComment.snippet.textDisplay
        allComments.push(text)
      }

      pageToken = data.nextPageToken
      if (!pageToken) break
    } catch (err) {
      console.error('[youtube-comments] Fetch error:', err)
      break
    }
  }

  return filterTracklistComments(allComments)
}

/**
 * Filter comments to only include those that actually contain track identification data.
 *
 * INCLUDE:
 * - Comments with 3+ timestamps (likely a tracklist)
 * - Comments with "tracklist" / "track list" / "setlist" keyword
 * - Comments with a timestamp followed by "Artist - Title" pattern
 *
 * EXCLUDE:
 * - Reaction comments with a single timestamp ("24:21 BANGERRR", "36:15 is pure magic")
 * - Comments that just reference a timestamp with an emotional reaction
 */
function filterTracklistComments(comments: string[]): string[] {
  const results: { comment: string; score: number }[] = []

  for (const comment of comments) {
    const timestamps = comment.match(/\d{1,2}:\d{2}/g) || []

    // ── Category 1: Full tracklist (3+ timestamps) ──
    if (timestamps.length >= 3) {
      results.push({ comment, score: 100 + timestamps.length })
      continue
    }

    // ── Category 2: Tracklist keyword ──
    if (/tracklist|track\s?list|song\s?list|set\s?list/i.test(comment)) {
      results.push({ comment, score: 80 })
      continue
    }

    // ── Category 3: Single timestamp with a clear "Artist - Title" identification ──
    if (timestamps.length >= 1) {
      // Check if the comment contains a structured track reference:
      // Patterns that indicate a real track ID (not a reaction):
      //   "56:11 - Shiver" → has dash separator
      //   "Track at 24:00 is Artist - Title"
      //   "1:02:33 Artist - Title"
      const hasTrackPattern = /\d{1,2}:\d{2}\s*[-–—]\s*\S/.test(comment)  // timestamp followed by dash + text
        || /\d{1,2}:\d{2}\s+\w+\s*[-–—]\s*\w+/.test(comment)             // timestamp space Artist - Title
        || /(?:track|song|ID)\s+(?:at\s+)?\d{1,2}:\d{2}\s+is/i.test(comment) // "track at XX:XX is"

      if (hasTrackPattern) {
        results.push({ comment, score: 30 })
        continue
      }

      // ── REJECT: Single timestamp without track identification ──
      // These are reaction comments like:
      //   "24:21 BANGERRR"
      //   "36:15 crystallized is a pure magic"
      //   "51:00 mark that song will always be so fire"
      // Skip them — they don't help with track detection
      continue
    }

    // No timestamps — skip
  }

  // Sort by score (tracklists first), return just the comment text
  return results
    .sort((a, b) => b.score - a.score)
    .map((r) => r.comment)
}
