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
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  beatport_url?: string
  youtube_url?: string
}

/**
 * Parse tracklist data from 1001tracklists.com page source HTML.
 * Uses Schema.org microdata (itemprop) and cueValues JS for timestamps.
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
  const rows: Array<{ index: number; id: string; classes: string }> = []
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = trackRowPattern.exec(html)) !== null) {
    rows.push({ index: rowMatch.index, id: rowMatch[1], classes: rowMatch[3] })
  }

  if (rows.length === 0) return tracks

  let position = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const start = row.index
    const end = i + 1 < rows.length ? rows[i + 1].index : html.length
    const block = html.substring(start, end)

    if (!block.includes('itemprop="name"')) continue

    const isContinuation = row.classes.includes(' con') || row.classes.endsWith(' con')
      || /tracknumber_value"[^>]*>\s*w\/\s*</.test(block)

    if (!isContinuation) position++

    const trackIdMatch = block.match(/data-trackid="([^"]+)"/)
    const isIdedMatch = block.match(/data-isided="([^"]+)"/)
    const trackContentId = trackIdMatch ? trackIdMatch[1] : undefined
    const isIdentified = isIdedMatch ? isIdedMatch[1] === 'true' : undefined

    const contentIdMatch = block.match(/id="(tlp\d+_content)"/)
    const contentDivId = contentIdMatch ? contentIdMatch[1] : undefined

    const nameRaw = extractMeta(block, 'name')
    const nameWithArtist = decodeEntities(nameRaw)
    const byArtist = decodeEntities(extractMeta(block, 'byArtist'))
    const rawPublisher = extractMeta(block, 'publisher')
    const durationStr = extractMeta(block, 'duration')
    const genre = decodeEntities(extractMeta(block, 'genre'))
    const trackPath = extractMeta(block, 'url')

    let artist = byArtist || ''
    let title = ''

    if (nameWithArtist) {
      const dashIndex = nameWithArtist.indexOf(' - ')
      if (dashIndex > 0) {
        if (!artist) artist = nameWithArtist.substring(0, dashIndex).trim()
        title = nameWithArtist.substring(dashIndex + 3).trim()
      } else {
        title = nameWithArtist
      }
    }

    if (!title && !artist) continue

    // Label
    let label = ''
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

    const durationSecs = durationStr ? parseIso(durationStr) : undefined

    // Cue time
    let startSeconds: number | undefined
    if (contentDivId && cueMap.has(contentDivId)) {
      startSeconds = cueMap.get(contentDivId)
    }
    if (startSeconds === undefined) {
      const inputCue = block.match(/id="tlp\d+_cue_seconds"[^>]*value="(\d+)"/)
      if (inputCue) startSeconds = parseInt(inputCue[1])
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

    // Artwork
    let artworkUrl: string | undefined
    const artMatch = block.match(/data-src="(https?:\/\/(?:i1\.sndcdn\.com|geo-media\.beatport\.com|is\d+-ssl\.mzstatic\.com|cdn\.1001tracklists\.com)[^"]+)"/)
    if (artMatch && !artMatch[1].includes('default_')) {
      artworkUrl = artMatch[1]
    }

    // Service links
    const svcLinks = extractServices(block, nameWithArtist)

    const trackUrl = trackPath ? `https://www.1001tracklists.com${trackPath}` : undefined

    tracks.push({
      position,
      title: title || 'ID',
      artist: artist || 'ID',
      label: label || undefined,
      artwork_url: artworkUrl,
      cue_time: cueTime,
      start_seconds: startSeconds,
      duration_seconds: durationSecs,
      genre: genre || undefined,
      track_url: trackUrl,
      track_content_id: trackContentId,
      is_continuation: isContinuation || undefined,
      is_identified: isIdentified,
      ...svcLinks,
    })
  }

  return tracks
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
    .replace(/&sup2;/g, '²').replace(/&reg;/g, '®').replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
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
