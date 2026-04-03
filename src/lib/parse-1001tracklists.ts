// 1001Tracklists HTML parser — pure string/regex, no DOM or Node APIs.
// Shared between browser (client-side parsing) and Worker (server-side fallback).

export interface Track1001Parsed {
  position: number
  title: string
  artist: string
  label?: string
  artwork_url?: string
  cue_time?: string
  start_seconds?: number
  duration_seconds?: number
  genre?: string
  track_url?: string
  track_content_id?: string
  is_continuation?: boolean
  is_identified?: boolean
  is_mashup?: boolean
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  beatport_url?: string
  youtube_url?: string
}

/**
 * Parse tracklist data from 1001tracklists.com page source HTML.
 * Uses Schema.org microdata (itemprop) and cueValues JS for timestamps.
 * Handles unidentified "ID - ID" tracks and skips mashup sub-positions.
 */
export function parse1001TracklistFromHtml(html: string): Track1001Parsed[] {
  const tracks: Track1001Parsed[] = []

  // ─── Pre-parse: extract cue values from JavaScript ───
  const cueMap = new Map<string, number>()
  const cueEntryPattern = /cueValuesEntry\.seconds\s*=\s*(\d+);[^}]*?cueValuesEntry\.ids\[0\]\s*=\s*'([^']+)'/g
  let cueMatch: RegExpExecArray | null
  while ((cueMatch = cueEntryPattern.exec(html)) !== null) {
    const seconds = parseInt(cueMatch[1])
    const contentId = cueMatch[2]
    cueMap.set(contentId, seconds)
    // Map additional ids (continuation tracks sharing the same cue)
    const extraIds = html.substring(cueMatch.index, cueMatch.index + 500)
    const extraPattern = /cueValuesEntry\.ids\[(\d+)\]\s*=\s*'([^']+)'/g
    let extraMatch: RegExpExecArray | null
    while ((extraMatch = extraPattern.exec(extraIds)) !== null) {
      cueMap.set(extraMatch[2], seconds)
    }
  }

  // Match all track row opening tags
  const trackRowPattern = /id="tlp_(\d+)"([^>]*?)class="([^"]*tlpItem[^"]*)"([^>]*)>/g
  const rows: Array<{ index: number; id: string; classes: string; fullTag: string }> = []
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = trackRowPattern.exec(html)) !== null) {
    rows.push({
      index: rowMatch.index,
      id: rowMatch[1],
      classes: rowMatch[3],
      fullTag: rowMatch[0],
    })
  }

  if (rows.length === 0) return tracks

  let position = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const start = row.index
    const end = i + 1 < rows.length ? rows[i + 1].index : html.length
    const block = html.substring(start, end)

    // ─── Skip mashup sub-positions ───
    // These are hidden sub-components of mashup tracks (e.g. "Eric Prydz - Pjanoo"
    // inside a "Disco Lines vs Eric Prydz vs Armin Van Buuren" mashup).
    // They have data-mashpos="true" and class="tgHid".
    if (/data-mashpos="true"/.test(block.substring(0, 300))) continue

    const isContinuation = row.classes.includes(' con') || row.classes.endsWith(' con')
      || /tracknumber_value"[^>]*>\s*w\/\s*</.test(block)

    if (!isContinuation) position++

    const trackIdMatch = block.match(/data-trackid="([^"]+)"/)
    const isIdedMatch = block.match(/data-isided="([^"]+)"/)
    const trackContentId = trackIdMatch ? trackIdMatch[1] : undefined
    const isIdentified = isIdedMatch ? isIdedMatch[1] === 'true' : false

    // Detect mashup tracks (bootleg class or data-mashup attribute)
    const isMashup = /data-mashup="/.test(block.substring(0, 300))
      || /class="[^"]*bootleg/.test(block)

    const contentIdMatch = block.match(/id="(tlp\d+_content)"/)
    const contentDivId = contentIdMatch ? contentIdMatch[1] : undefined

    const hasMicrodata = block.includes('itemprop="name"')

    let artist = ''
    let title = ''
    let label = ''
    let durationSecs: number | undefined
    let genre: string | undefined
    let trackUrl: string | undefined
    let artworkUrl: string | undefined
    let svcLinks: Record<string, string | undefined> = {}

    if (hasMicrodata) {
      // ─── Full microdata path (identified tracks) ───
      const nameRaw = extractMeta(block, 'name')
      const nameWithArtist = decodeEntities(nameRaw)
      const byArtist = decodeEntities(extractMeta(block, 'byArtist'))
      const rawPublisher = extractMeta(block, 'publisher')
      const durationStr = extractMeta(block, 'duration')
      genre = decodeEntities(extractMeta(block, 'genre')) || undefined
      const trackPath = extractMeta(block, 'url')

      artist = byArtist || ''

      if (nameWithArtist) {
        const dashIndex = nameWithArtist.indexOf(' - ')
        if (dashIndex > 0) {
          if (!artist) artist = nameWithArtist.substring(0, dashIndex).trim()
          title = nameWithArtist.substring(dashIndex + 3).trim()
        } else {
          title = nameWithArtist
        }
      }

      // Label from publisher microdata
      if (rawPublisher) {
        const decoded = decodeEntities(rawPublisher)
        const labelNames: string[] = []
        const lp = /title="open label page">([^<]+)<\/a>/g
        let lm: RegExpExecArray | null
        while ((lm = lp.exec(decoded)) !== null) {
          if (lm[1].trim()) labelNames.push(lm[1].trim())
        }
        if (labelNames.length === 0) {
          const stripped = decoded.replace(/<[^>]+>/g, '').trim()
          if (stripped) labelNames.push(stripped)
        }
        label = labelNames.join(' / ')
      }

      durationSecs = durationStr ? parseIso(durationStr) : undefined
      trackUrl = trackPath ? `https://www.1001tracklists.com${trackPath}` : undefined
      svcLinks = extractServices(block, nameWithArtist)
    } else {
      // ─── Fallback path: no microdata (ID tracks, partial IDs) ───
      // Parse the trackValue span text as "Artist - Title"
      const parsed = parseTrackValueText(block)
      artist = parsed.artist
      title = parsed.title
    }

    // Fall back to "ID" if we got nothing
    if (!title) title = 'ID'
    if (!artist) artist = 'ID'

    // ─── Cue time (works for all tracks) ───
    let startSeconds: number | undefined
    if (contentDivId && cueMap.has(contentDivId)) {
      startSeconds = cueMap.get(contentDivId)
    }
    if (startSeconds === undefined) {
      const inputCue = block.match(/id="tlp\d+_cue_seconds"[^>]*value="(\d+)"/)
      if (inputCue && parseInt(inputCue[1]) > 0) startSeconds = parseInt(inputCue[1])
    }

    let cueTime: string | undefined
    if (startSeconds !== undefined) {
      const h = Math.floor(startSeconds / 3600)
      const m = Math.floor((startSeconds % 3600) / 60)
      const s = startSeconds % 60
      cueTime = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`
    }

    // ─── Artwork (works for all tracks) ───
    const artMatch = block.match(/data-src="(https?:\/\/(?:i1\.sndcdn\.com|geo-media\.beatport\.com|is\d+-ssl\.mzstatic\.com|cdn\.1001tracklists\.com)[^"]+)"/)
    if (artMatch && !artMatch[1].includes('default_')) {
      artworkUrl = artMatch[1]
    }

    tracks.push({
      position,
      title,
      artist,
      label: label || undefined,
      artwork_url: artworkUrl,
      cue_time: cueTime,
      start_seconds: startSeconds,
      duration_seconds: durationSecs,
      genre,
      track_url: trackUrl,
      track_content_id: trackContentId,
      is_continuation: isContinuation || undefined,
      is_identified: isIdentified || undefined,
      is_mashup: isMashup || undefined,
      ...svcLinks,
    })
  }

  return tracks
}

// ═══════════════════════════════════════════
// Set-level metadata
// ═══════════════════════════════════════════

export interface TracklistMetadata {
  title: string | null
  artist: string | null
  date: string | null           // YYYY-MM-DD
  youtube_url: string | null
  youtube_video_id: string | null
  duration_seconds: number | null
  tracklist_id: string | null
  genre: string | null
  venue: string | null
}

/**
 * Extract set-level metadata from a 1001tracklists.com page source HTML.
 */
export function parse1001TracklistMetadata(html: string): TracklistMetadata {
  // ─── Tracklist ID ───
  let tracklist_id: string | null = null
  const tlIdMatch = html.match(/1001tracklists\.com\/tracklist\/([a-zA-Z0-9]+)/)
  if (tlIdMatch) tracklist_id = tlIdMatch[1]

  // ─── Title ───
  let title: string | null = null
  // 1. <title> tag (most reliable — always present, well-formatted)
  const titleTag = html.match(/<title>([^<]+)<\/title>/)
  if (titleTag) {
    title = decodeEntities(titleTag[1].replace(/\s*[|–-]\s*1001Tracklists.*$/i, '').trim())
  }
  // 2. Schema.org name span
  if (!title) {
    const schemaNameMatch = html.match(/<span[^>]+itemprop="name"[^>]*>([^<]+)<\/span>/)
    if (schemaNameMatch) title = decodeEntities(schemaNameMatch[1].trim())
  }
  // 3. <h1 id="pageTitle">
  if (!title) {
    const h1Match = html.match(/<h1[^>]+id="pageTitle"[^>]*>([\s\S]*?)<\/h1>/)
    if (h1Match) {
      // Strip HTML tags inside <h1>
      title = decodeEntities(h1Match[1].replace(/<[^>]+>/g, '').trim())
    }
  }

  // ─── Artist ───
  let artist: string | null = null
  // 1. DJ link inside #pageTitle: <a href="/dj/slug/">
  const djLinkMatch = html.match(/<a[^>]+href="\/dj\/[^"]+\/?(?:index\.html)?"[^>]*>([^<]+)<\/a>/)
  if (djLinkMatch) artist = decodeEntities(djLinkMatch[1].trim())
  // 2. Schema.org performer
  if (!artist) {
    const performerMatch = html.match(/itemprop="performer"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)
    if (performerMatch) artist = decodeEntities(performerMatch[1].trim())
  }
  // 3. itemprop="author" meta in the MusicPlaylist
  if (!artist) {
    const authorMatch = html.match(/itemprop="author"\s+content="([^"]+)"/)
    if (authorMatch) artist = decodeEntities(authorMatch[1].trim())
  }

  // ─── Date ───
  let date: string | null = null
  // 1. MusicPlaylist datePublished (inside #tlTab, most accurate)
  const tlTabSection = html.match(/id="tlTab"[\s\S]*?itemprop="datePublished"\s+content="(\d{4}-\d{2}-\d{2})/)
  if (tlTabSection) date = tlTabSection[1]
  // 2. dcterms.created meta
  if (!date) {
    const dcMatch = html.match(/name="dcterms\.created"\s+content="(\d{4}-\d{2}-\d{2})/)
    if (dcMatch) date = dcMatch[1]
  }
  // 3. Schema.org startDate
  if (!date) {
    const startDateMatch = html.match(/itemprop="startDate"[^>]*content="(\d{4}-\d{2}-\d{2})/)
    if (startDateMatch) date = startDateMatch[1]
  }
  // 4. Any datePublished
  if (!date) {
    const datePublishedMatch = html.match(/itemprop="datePublished"[^>]*content="(\d{4}-\d{2}-\d{2})/)
    if (datePublishedMatch) date = datePublishedMatch[1]
  }

  // ─── Genre ───
  let genre: string | null = null
  // From the MusicPlaylist itemprop="genre"
  const genreMatch = html.match(/id="tlTab"[\s\S]*?itemprop="genre"\s+content="([^"]+)"/)
  if (genreMatch) genre = decodeEntities(genreMatch[1].trim())
  // Fallback: the genre div
  if (!genre) {
    const genreDiv = html.match(/id="tl_music_styles"[^>]*>([^<]+)</)
    if (genreDiv) genre = decodeEntities(genreDiv[1].trim())
  }

  // ─── Venue / Source ───
  let venue: string | null = null
  const sourceMatch = html.match(/<a[^>]+href="\/source\/[^"]+\/?[^"]*"[^>]*>([^<]+)<\/a>/)
  if (sourceMatch) venue = decodeEntities(sourceMatch[1].trim())

  // ─── YouTube URL & Video ID ───
  let youtube_url: string | null = null
  let youtube_video_id: string | null = null

  // 1. ytPlayer JS variable (most reliable for the actual set video)
  const ytPlayerMatch = html.match(/ytPlayer\.idPlayer\s*=\s*"([A-Za-z0-9_-]{10,12})"/)
  if (ytPlayerMatch) {
    youtube_video_id = ytPlayerMatch[1]
    youtube_url = `https://www.youtube.com/watch?v=${youtube_video_id}`
  }
  // 2. iframe embed src
  if (!youtube_video_id) {
    const embedMatch = html.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{10,12})/)
    if (embedMatch) {
      youtube_video_id = embedMatch[1]
      youtube_url = `https://www.youtube.com/watch?v=${youtube_video_id}`
    }
  }
  // 3. ytWidget element id
  if (!youtube_video_id) {
    const widgetMatch = html.match(/id="ytWidget_([A-Za-z0-9_-]{10,12})"/)
    if (widgetMatch) {
      youtube_video_id = widgetMatch[1]
      youtube_url = `https://www.youtube.com/watch?v=${youtube_video_id}`
    }
  }
  // 4. Regular youtube link
  if (!youtube_video_id) {
    const watchMatch = html.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{10,12})/)
    if (watchMatch) {
      youtube_video_id = watchMatch[1]
      youtube_url = `https://www.youtube.com/watch?v=${youtube_video_id}`
    }
  }

  // ─── Duration ───
  let duration_seconds: number | null = null
  // 1. ytPlayer.duration JS variable (most accurate for the set)
  const ytDurationMatch = html.match(/ytPlayer\.duration\s*=\s*"(\d+)"/)
  if (ytDurationMatch) duration_seconds = parseInt(ytDurationMatch[1])
  // 2. Schema.org duration (VideoObject)
  if (!duration_seconds) {
    const durationMatch = html.match(/itemprop="duration"[^>]*content="([^"]+)"/)
    if (durationMatch) {
      const parsed = parseIso(durationMatch[1])
      if (parsed) duration_seconds = parsed
    }
  }

  return { title, artist, date, youtube_url, youtube_video_id, duration_seconds, tracklist_id, genre, venue }
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function extractMeta(block: string, itemprop: string): string {
  const m = block.match(new RegExp(`itemprop="${itemprop}"[^>]*content="([^"]*)"`, ''))
  if (m) return m[1]
  const m2 = block.match(new RegExp(`content="([^"]*)"[^>]*itemprop="${itemprop}"`, ''))
  return m2 ? m2[1] : ''
}

/**
 * Parse the trackValue span text content as "Artist - Title" for rows
 * that lack Schema.org microdata (fully/partially unidentified tracks).
 */
function parseTrackValueText(block: string): { artist: string; title: string } {
  // Look for the trackValue span and extract all text content
  const tvMatch = block.match(/class="trackValue[^"]*"[^>]*>([\s\S]*?)<\/span>\s*(?:<span[^>]*class="(?:iBlock|fa)|<\/div>)/)
  if (!tvMatch) return { artist: 'ID', title: 'ID' }

  // Strip all HTML tags, collapse whitespace
  let text = tvMatch[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Decode entities
  text = decodeEntities(text)

  if (!text || text === '- ' || text === '-') return { artist: 'ID', title: 'ID' }

  // Split on " - " separator
  const dashIndex = text.indexOf(' - ')
  if (dashIndex > 0) {
    const artist = text.substring(0, dashIndex).trim()
    const title = text.substring(dashIndex + 3).trim()
    return {
      artist: artist || 'ID',
      title: title || 'ID',
    }
  }

  return { artist: 'ID', title: text || 'ID' }
}

function parseIso(d: string): number | undefined {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(d)
  if (!m) return undefined
  return (m[1] ? parseInt(m[1]) : 0) * 3600 + (m[2] ? parseInt(m[2]) : 0) * 60 + (m[3] ? parseFloat(m[3]) : 0)
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&Uuml;/g, 'Ü').replace(/&uuml;/g, 'ü')
    .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')
    .replace(/&sup2;/g, '²').replace(/&reg;/g, '®').replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&equiv;/g, '≡')
}

function extractServices(block: string, trackName: string): Record<string, string | undefined> {
  const links: Record<string, string | undefined> = {}
  const q = trackName.replace(/\s*\(.*?\)\s*$/, '')
  if (!q) return links

  const svcs: Array<{ icon: string; key: string; url: (q: string) => string }> = [
    { icon: 'fa-spotify', key: 'spotify_url', url: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
    { icon: 'fa-apple', key: 'apple_music_url', url: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}` },
    { icon: 'fa-soundcloud', key: 'soundcloud_url', url: (q) => `https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}` },
    { icon: 'fa-shopping-cart', key: 'beatport_url', url: (q) => `https://www.beatport.com/search?q=${encodeURIComponent(q)}` },
  ]

  for (const svc of svcs) {
    if (new RegExp(`mAction[^"]*${svc.icon}|${svc.icon}[^"]*mAction`).test(block)) {
      links[svc.key] = svc.url(q)
    }
  }

  if (/mAction[^"]*fa-video-camera|fa-video-camera[^"]*mAction/.test(block)) {
    links.youtube_url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
  }

  return links
}
