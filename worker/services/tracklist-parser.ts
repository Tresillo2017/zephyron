// Tracklist parser — extracts track names + timestamps from text using regex.
// Regex is the primary approach since tracklists are highly structured.

export interface ParsedTrack {
  title: string
  artist: string
  start_seconds: number
  source: 'description' | 'comment' | 'regex'
}

/**
 * Extract tracklist from YouTube description + comments using regex.
 */
export function parseTracklist(
  description: string,
  comments: string[]
): ParsedTrack[] {
  // Try regex on ALL text sources (description + comments)
  const allText = [description, ...comments].join('\n')
  return extractViaRegex(allText)
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
  const cleaned = line.replace(/^\d{1,3}\s*[-.)]\s*/, '')

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
