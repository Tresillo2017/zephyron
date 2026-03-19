// Tracklist parser — extracts track names + timestamps from text using regex + LLM
// Regex is the primary approach since tracklists are highly structured.
// LLM is used as enhancement to clean up track/artist splitting.

export interface ParsedTrack {
  title: string
  artist: string
  start_seconds: number
  source: 'description' | 'comment' | 'regex'
}

/**
 * Extract tracklist from YouTube description + comments.
 * Strategy: regex first (fast, reliable for structured tracklists),
 * then LLM only if regex finds nothing.
 */
export async function parseTracklist(
  description: string,
  comments: string[],
  env: Env
): Promise<ParsedTrack[]> {
  // 1. Try regex on ALL text sources (description + comments)
  const allText = [description, ...comments].join('\n')
  const regexTracks = extractViaRegex(allText)

  if (regexTracks.length >= 3) {
    console.log(`[tracklist-parser] Regex found ${regexTracks.length} tracks`)
    return regexTracks
  }

  // 2. If regex found few/no tracks, try LLM on the best tracklist comment
  const tracklistComment = findBestTracklistComment(comments)
  const textForLLM = tracklistComment || description

  if (textForLLM.length > 50) {
    const llmTracks = await extractViaLLM(textForLLM, env)
    if (llmTracks.length > regexTracks.length) {
      console.log(`[tracklist-parser] LLM found ${llmTracks.length} tracks (vs ${regexTracks.length} regex)`)
      return llmTracks
    }
  }

  return regexTracks
}

/**
 * Find the comment most likely to contain a full tracklist.
 * Looks for comments with many timestamps or "tracklist" keyword.
 */
function findBestTracklistComment(comments: string[]): string | null {
  let best: string | null = null
  let bestScore = 0

  for (const comment of comments) {
    let score = 0
    // Count timestamps
    const timestamps = comment.match(/\d{1,2}:\d{2}/g)
    score += (timestamps?.length || 0) * 2
    // Bonus for tracklist keywords
    if (/tracklist|track\s*list|set\s*list/i.test(comment)) score += 10
    // Bonus for numbered lines
    const numberedLines = comment.match(/^\s*\d{1,2}\s*[-.)]/gm)
    score += (numberedLines?.length || 0)

    if (score > bestScore) {
      bestScore = score
      best = comment
    }
  }

  return bestScore >= 6 ? best : null
}

async function extractViaLLM(text: string, env: Env): Promise<ParsedTrack[]> {
  try {
    const result = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        {
          role: 'system',
          content: `Extract the tracklist. Return ONLY a JSON array. No other text.`,
        },
        {
          role: 'user',
          content: `Extract tracks from this DJ set tracklist. Return JSON array:
[{"title":"Song Name","artist":"Artist Name","start_seconds":0}]

Convert timestamps: "1:23:45"=5025, "45:30"=2730, "3:20"=200, "0:12"=12
Split "Artist - Title" correctly. Include features (ft./feat.) in the title.

Text:
${text.slice(0, 3000)}`,
        },
      ],
    })

    const responseText = typeof result === 'object' && result !== null && 'response' in result
      ? String((result as { response: string }).response) : ''
    if (!responseText) return []

    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    let parsed: unknown[]
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      const fixed = jsonMatch[0].replace(/,\s*\]/g, ']').replace(/'/g, '"')
      try { parsed = JSON.parse(fixed) } catch { return [] }
    }

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null &&
        typeof (item as Record<string, unknown>).title === 'string'
      )
      .map((item) => ({
        title: String(item.title).trim(),
        artist: String(item.artist || '').trim(),
        start_seconds: Math.max(0, Number(item.start_seconds) || 0),
        source: 'comment' as const,
      }))
      .filter((t) => t.title.length > 0)
  } catch (err) {
    console.error('[tracklist-parser] LLM extraction failed:', err)
    return []
  }
}

/**
 * Regex-based tracklist extraction — handles multiple common formats:
 *
 * Format 1: "0:12 - Artist - Title"
 * Format 2: "1 - 0:12 - Artist - Title"
 * Format 3: "00:12 Artist - Title"
 * Format 4: "1. 0:12 Artist - Title"
 * Format 5: "1:23:45 Artist - Title" (HH:MM:SS)
 * Format 6: "0:12 - Artist ft. Someone - Title (Remix)"
 */
function extractViaRegex(text: string): ParsedTrack[] {
  const tracks: ParsedTrack[] = []
  const lines = text.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.length < 5) continue

    // Try to extract a timestamp from this line
    const tsResult = extractTimestamp(line)
    if (!tsResult) continue

    const { seconds, restOfLine } = tsResult
    if (restOfLine.length < 2) continue

    // Parse artist - title from the remaining text
    const { artist, title } = parseArtistTitle(restOfLine)
    if (!title || title.length < 2) continue

    tracks.push({
      title,
      artist,
      start_seconds: seconds,
      source: 'regex',
    })
  }

  // Deduplicate by timestamp (within 5 seconds)
  const deduped: ParsedTrack[] = []
  for (const track of tracks) {
    const existing = deduped.find(
      (t) => Math.abs(t.start_seconds - track.start_seconds) < 5
    )
    if (!existing) deduped.push(track)
  }

  return deduped.sort((a, b) => a.start_seconds - b.start_seconds)
}

/**
 * Extract a timestamp from a line, handling many formats.
 * Returns the timestamp in seconds and the remaining text after the timestamp.
 */
function extractTimestamp(line: string): { seconds: number; restOfLine: string } | null {
  // Strip leading track number: "1 - ", "1. ", "1) ", "01 - " etc.
  let cleaned = line.replace(/^\d{1,3}\s*[-.)]\s*/, '')

  // Match H:MM:SS or HH:MM:SS
  const hmsMatch = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*[-–—:)|\s]\s*(.+)/)
  if (hmsMatch) {
    const seconds = parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3])
    return { seconds, restOfLine: hmsMatch[4].trim() }
  }

  // Match M:SS or MM:SS
  const msMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*[-–—:)|\s]\s*(.+)/)
  if (msMatch) {
    const seconds = parseInt(msMatch[1]) * 60 + parseInt(msMatch[2])
    return { seconds, restOfLine: msMatch[3].trim() }
  }

  return null
}

/**
 * Parse "Artist - Title" from track text.
 * Handles: "Artist - Title", "Artist ft. X - Title (Remix)", "Title w/ Artist" etc.
 */
function parseArtistTitle(text: string): { artist: string; title: string } {
  // Remove trailing "w/ TIMESTAMP - ..." (some tracklists have sub-entries)
  const withoutSub = text.replace(/\s+w\/\s+\d{1,2}:\d{2}\s*[-–—]\s*.+$/, '')

  // Split on " - " (the primary artist/title separator in tracklists)
  const parts = withoutSub.split(/\s*[-–—]\s*/)

  if (parts.length >= 2) {
    const artist = parts[0].trim()
    const title = parts.slice(1).join(' - ').trim()

    // Clean up: remove trailing "(Soundcloud)" or similar tags
    const cleanTitle = title.replace(/\s*\((?:Soundcloud|YouTube|Free DL|Free Download)\)\s*$/i, '').trim()

    return { artist, title: cleanTitle }
  }

  // No dash separator — entire text is the title
  return { artist: '', title: text.trim() }
}
