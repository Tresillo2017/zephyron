// 1001Tracklists.com scraper — pure fetch() with challenge solver.
// No browser/Puppeteer needed. The site uses a custom JS challenge (NOT Cloudflare Turnstile)
// that is a simple Java-style String.hashCode() proof solvable server-side.
//
// Strategy based on: https://github.com/rvndev/1001tracklists
// Parsing uses Schema.org microdata (itemprop) embedded in the page HTML.

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface Track1001 {
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
  track_content_id?: string    // data-trackid (1001tl stable ID)
  is_continuation?: boolean    // true if "w/" — played with previous track
  is_identified?: boolean      // false if track is "ID - ID"
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  beatport_url?: string
  youtube_url?: string
  deezer_url?: string
  bandcamp_url?: string
  traxsource_url?: string
}

export interface TracklistResult1001 {
  tracks: Track1001[]
  tracklist_id: string
  source: 'challenge_solver' | 'html_parse'
  error?: string
  fallback_required?: boolean
}

interface ChallengeSolution {
  cookies: string
  captcha: 1
  ts: number
  bChk: number
  challengeHtml: string
}

// ═══════════════════════════════════════════
// URL utilities
// ═══════════════════════════════════════════

export function extract1001TracklistId(url: string): string | null {
  const match = url.match(/1001tracklists\.com\/tracklist\/([a-z0-9]+)/i)
  return match ? match[1] : null
}

export function is1001TracklistUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?1001tracklists\.com\/tracklist\/[a-z0-9]+/i.test(url)
}

// ═══════════════════════════════════════════
// Challenge solver
// ═══════════════════════════════════════════

const BROWSER_HEADERS: Record<string, string> = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'sec-ch-ua': '"Google Chrome";v="135", "Chromium";v="135", "Not_A Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
}

function javaStringHashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h = (h << 5) - h + c
    h |= 0
  }
  return h
}

async function requestChallenge(url: string): Promise<Response> {
  return fetch(url, {
    headers: { ...BROWSER_HEADERS, 'Referer': url, 'Referrer-Policy': 'strict-origin-when-cross-origin' },
    method: 'GET',
    redirect: 'manual',
  })
}

async function solveChallenge(res: Response): Promise<ChallengeSolution> {
  const allCookies: string[] = []
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const cookiePair = value.split(';')[0]
      if (cookiePair) allCookies.push(cookiePair)
    }
  })
  const cookieString = allCookies.join('; ')

  const html = await res.text()

  // Check if already the real page
  if (/id="tlp_\d+"/.test(html) && html.includes('class="tlpItem')) {
    return { cookies: cookieString, captcha: 1, ts: 0, bChk: 0, challengeHtml: html }
  }

  const scriptMatch = html.match(/<script>\s*var\s+\w+\s*=\s*'([^']+)'\s*;?\s*<\/script>/)
  if (!scriptMatch) {
    throw new Error('Could not extract challenge variable from HTML')
  }

  const tsMatch = html.match(/i\.name\s*=\s*'ts'\s*;\s*i\.value\s*=\s*(\d+)/)
  if (!tsMatch) {
    throw new Error('Could not extract timestamp from challenge HTML')
  }

  const bChk = javaStringHashCode(scriptMatch[1])
  const ts = parseInt(tsMatch[1])

  console.log(`[1001tl] Challenge solved: var='${scriptMatch[1]}', ts=${ts}, bChk=${bChk}`)

  return { cookies: cookieString, captcha: 1, ts, bChk, challengeHtml: html }
}

async function submitSolution(url: string, solution: ChallengeSolution): Promise<Response> {
  const { captcha, ts, bChk, cookies } = solution
  return fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      'cache-control': 'max-age=0',
      'content-type': 'application/x-www-form-urlencoded',
      ...(cookies ? { 'cookie': cookies } : {}),
      'Referer': url,
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: `captcha=${captcha}&ts=${ts}&bChk=${bChk}`,
    method: 'POST',
    redirect: 'follow',
  })
}

// ═══════════════════════════════════════════
// Generic page fetch (challenge solver only, no parsing)
// ═══════════════════════════════════════════

export interface Page1001Result {
  html: string
  fallback_required: boolean
  error?: string
}

/**
 * Fetch any 1001Tracklists page using the challenge solver.
 * Returns raw HTML — the caller is responsible for parsing.
 * Works for event source pages, DJ pages, tracklist pages, etc.
 */
export async function fetch1001Page(url: string): Promise<Page1001Result> {
  try {
    console.log(`[1001tl] Fetching page: ${url}`)
    const challengeRes = await requestChallenge(url)
    const solution = await solveChallenge(challengeRes)

    let html: string

    if (solution.ts === 0) {
      console.log('[1001tl] No challenge detected, page loaded directly')
      html = solution.challengeHtml
    } else {
      console.log(`[1001tl] Submitting challenge solution (ts=${solution.ts}, bChk=${solution.bChk})`)
      const realPageRes = await submitSolution(url, solution)

      if (!realPageRes.ok) {
        console.warn(`[1001tl] Challenge POST returned HTTP ${realPageRes.status}`)
        return {
          html: '',
          fallback_required: true,
          error: `Challenge POST rejected (HTTP ${realPageRes.status}). Use manual HTML paste instead.`,
        }
      }

      html = await realPageRes.text()
    }

    const hasTurnstile = html.includes('turnstile-container') || html.includes('challenges.cloudflare.com')
    // Check if we got real content (not just a challenge page)
    const hasContent = html.includes('id="pageTitle"') || html.includes('class="tlpItem') || html.includes('class="bItm')

    if (hasTurnstile && !hasContent) {
      console.warn('[1001tl] POST returned challenge page again — Turnstile token is required')
      return {
        html: '',
        fallback_required: true,
        error: 'The site requires Cloudflare Turnstile validation. Use manual HTML paste instead.',
      }
    }

    if (!hasContent) {
      return {
        html: '',
        fallback_required: true,
        error: 'Response has no recognizable content. The challenge format may have changed.',
      }
    }

    return { html, fallback_required: false }
  } catch (err) {
    console.error('[1001tl] Page fetch failed:', err)
    return {
      html: '',
      fallback_required: true,
      error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

// ═══════════════════════════════════════════
// Tracklist fetch (challenge solver + microdata parse)
// ═══════════════════════════════════════════

export async function fetch1001Tracklist(url: string): Promise<TracklistResult1001> {
  const tracklistId = extract1001TracklistId(url)
  if (!tracklistId) {
    return { tracks: [], tracklist_id: '', source: 'challenge_solver', error: 'Invalid 1001tracklists URL' }
  }

  try {
    console.log(`[1001tl] Requesting challenge for: ${url}`)
    const challengeRes = await requestChallenge(url)
    const solution = await solveChallenge(challengeRes)

    let html: string

    if (solution.ts === 0) {
      console.log('[1001tl] No challenge detected, page loaded directly')
      html = solution.challengeHtml
    } else {
      console.log(`[1001tl] Submitting challenge solution (ts=${solution.ts}, bChk=${solution.bChk})`)
      const realPageRes = await submitSolution(url, solution)

      if (!realPageRes.ok) {
        console.warn(`[1001tl] Challenge POST returned HTTP ${realPageRes.status}`)
        return {
          tracks: [],
          tracklist_id: tracklistId,
          source: 'challenge_solver',
          error: `Challenge POST rejected (HTTP ${realPageRes.status}). Use manual HTML paste instead.`,
          fallback_required: true,
        }
      }

      html = await realPageRes.text()
    }

    const hasTrackItems = html.includes('class="tlpItem')
    const hasTurnstile = html.includes('turnstile-container') || html.includes('challenges.cloudflare.com')

    if (hasTurnstile && !hasTrackItems) {
      console.warn('[1001tl] POST returned challenge page again — Turnstile token is required')
      return {
        tracks: [],
        tracklist_id: tracklistId,
        source: 'challenge_solver',
        error: 'The site requires Cloudflare Turnstile validation. Use manual HTML paste instead.',
        fallback_required: true,
      }
    }

    if (!hasTrackItems) {
      return {
        tracks: [],
        tracklist_id: tracklistId,
        source: 'challenge_solver',
        error: 'Response has no tracklist content. The challenge format may have changed.',
        fallback_required: true,
      }
    }

    const tracks = parseTracklistMicrodata(html)
    console.log(`[1001tl] Extracted ${tracks.length} tracks via challenge solver`)

    if (tracks.length === 0) {
      return {
        tracks: [],
        tracklist_id: tracklistId,
        source: 'challenge_solver',
        error: 'Page loaded but no tracks could be parsed. Try manual HTML paste.',
        fallback_required: true,
      }
    }

    return { tracks, tracklist_id: tracklistId, source: 'challenge_solver' }
  } catch (err) {
    console.error('[1001tl] Challenge solver failed:', err)
    return {
      tracks: [],
      tracklist_id: tracklistId,
      source: 'challenge_solver',
      error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      fallback_required: true,
    }
  }
}

// ═══════════════════════════════════════════
// Schema.org microdata parser
// ═══════════════════════════════════════════

/**
 * Parse tracks from the full HTML using Schema.org microdata.
 *
 * Each track is inside a div with id="tlp_NNNNNNN" and class containing "tlpItem".
 * Continuation tracks (played simultaneously) have class="con" and show "w/" as position.
 * Service links are detected from icon classes (mAction = available, mIcon = unavailable).
 */
function parseTracklistMicrodata(html: string): Track1001[] {
  const tracks: Track1001[] = []

  // ─── Pre-parse: extract cue values from JavaScript ───
  // The page has a script with: cueValuesEntry.seconds = NNN; ... cueValuesEntry.ids = ['tlpN_content']
  // This is the most reliable source for timestamps.
  const cueMap = new Map<string, number>() // maps "tlpN_content" → seconds
  const cueEntryPattern = /cueValuesEntry\.seconds\s*=\s*(\d+);[^}]*?cueValuesEntry\.ids\[0\]\s*=\s*'([^']+)'/g
  let cueMatch: RegExpExecArray | null
  while ((cueMatch = cueEntryPattern.exec(html)) !== null) {
    const seconds = parseInt(cueMatch[1])
    const contentId = cueMatch[2] // e.g., "tlp1_content"
    cueMap.set(contentId, seconds)
    // Also map additional ids (ids[1], ids[2], etc. — continuation tracks sharing the same cue)
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

    // Detect continuation
    const isContinuation = row.classes.includes(' con') || row.classes.endsWith(' con')
      || /tracknumber_value"[^>]*>\s*w\/\s*</.test(block)

    if (!isContinuation) position++

    // Data attributes
    const trackIdMatch = block.match(/data-trackid="([^"]+)"/)
    const isIdedMatch = block.match(/data-isided="([^"]+)"/)
    const trackContentId = trackIdMatch ? trackIdMatch[1] : undefined
    const isIdentified = isIdedMatch ? isIdedMatch[1] === 'true' : undefined

    // Find the content div id (e.g., "tlp1_content") for cue lookup
    const contentIdMatch = block.match(/id="(tlp\d+_content)"/)
    const contentDivId = contentIdMatch ? contentIdMatch[1] : undefined

    // Microdata
    const nameRaw = extractMetaContent(block, 'name')
    const nameWithArtist = decodeHtmlEntities(nameRaw)
    const byArtist = decodeHtmlEntities(extractMetaContent(block, 'byArtist'))
    const rawPublisher = extractMetaContent(block, 'publisher')
    const durationStr = extractMetaContent(block, 'duration')
    const genre = decodeHtmlEntities(extractMetaContent(block, 'genre'))
    const trackPath = extractMetaContent(block, 'url')

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

    // Label from publisher
    let label = ''
    if (rawPublisher) {
      const decoded = decodeHtmlEntities(rawPublisher)
      const labelNames: string[] = []
      const labelPattern = /title="open label page">([^<]+)<\/a>/g
      let lm: RegExpExecArray | null
      while ((lm = labelPattern.exec(decoded)) !== null) {
        if (lm[1].trim()) labelNames.push(lm[1].trim())
      }
      if (labelNames.length === 0) {
        const stripped = decoded.replace(/<[^>]+>/g, '').trim()
        if (stripped) labelNames.push(stripped)
      }
      label = labelNames.join(' / ')
    }

    const durationSecs = durationStr ? parseIsoDuration(durationStr) : undefined

    // ─── Cue time: prefer JS cueValues, fall back to hidden input ───
    let startSeconds: number | undefined

    // Method 1: from the pre-parsed JS cueValues (most reliable)
    if (contentDivId && cueMap.has(contentDivId)) {
      startSeconds = cueMap.get(contentDivId)
    }

    // Method 2: from hidden input
    if (startSeconds === undefined) {
      const inputCueMatch = block.match(/id="tlp\d+_cue_seconds"[^>]*value="(\d+)"/)
      if (inputCueMatch) {
        startSeconds = parseInt(inputCueMatch[1])
      }
    }

    // Format cue time string
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
    const serviceLinks = extractServiceAvailability(block)

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
      ...serviceLinks,
    })
  }

  return tracks
}

/**
 * Extract service link availability from a track block's mediaRow.
 *
 * Available links: onclick="...new MediaViewer(this, null, {idObject: 5, idItem: NNN, idSource: 'NN'..."
 *   with class="mAction fa colorized fa-24 fa-SERVICE"
 *
 * Unavailable: class="fa-24 fa-SERVICE mIcon"
 *
 * We can't get the actual URLs (they're resolved via AJAX) but we can detect
 * which services have content and build search URLs as useful fallbacks.
 */
function extractServiceAvailability(block: string): Record<string, string | undefined> {
  const links: Record<string, string | undefined> = {}

  // Extract the track name for building search URLs
  const nameRaw = extractMetaContent(block, 'name')
  const trackName = decodeHtmlEntities(nameRaw).replace(/\s*\(.*?\)\s*$/, '') // strip remix suffix for cleaner search

  // Map: fa icon class suffix → service key → search URL builder
  const services: Array<{
    icon: string
    key: string
    searchUrl: (q: string) => string
  }> = [
    { icon: 'fa-spotify', key: 'spotify_url', searchUrl: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
    { icon: 'fa-apple', key: 'apple_music_url', searchUrl: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}` },
    { icon: 'fa-soundcloud', key: 'soundcloud_url', searchUrl: (q) => `https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}` },
    { icon: 'fa-shopping-cart', key: 'beatport_url', searchUrl: (q) => `https://www.beatport.com/search?q=${encodeURIComponent(q)}` },
  ]

  for (const svc of services) {
    // Check if this service has an available (clickable) link — mAction class means it's active
    const availablePattern = new RegExp(`mAction[^"]*${svc.icon}|${svc.icon}[^"]*mAction`)
    if (availablePattern.test(block) && trackName) {
      links[svc.key] = svc.searchUrl(trackName)
    }
  }

  // YouTube: check for video-camera icon with mAction (idSource: '13')
  if (/mAction[^"]*fa-video-camera|fa-video-camera[^"]*mAction/.test(block) && trackName) {
    links.youtube_url = `https://www.youtube.com/results?search_query=${encodeURIComponent(trackName)}`
  }

  return links
}

// ═══════════════════════════════════════════
// HTML fallback parser (manual paste)
// ═══════════════════════════════════════════

export function parse1001TracklistHtml(
  html: string,
  tracklistId?: string
): TracklistResult1001 {
  let tracks = parseTracklistMicrodata(html)

  if (tracks.length === 0) {
    tracks = parseTracklistFallback(html)
  }

  console.log(`[1001tl] Parsed ${tracks.length} tracks from pasted HTML`)

  return {
    tracks,
    tracklist_id: tracklistId || '',
    source: 'html_parse',
  }
}

function parseTracklistFallback(html: string): Track1001[] {
  const tracks: Track1001[] = []
  const lines = html.split('\n')
  let trackNum = 0

  for (const line of lines) {
    const trackMatch = line.match(
      /(?:(\d{1,3})[.\s)]+)?([^<\n]+?)\s*[-–—]\s*([^<\n\[]+)(?:\s*\[([^\]]+)\])?/
    )
    if (trackMatch && trackMatch[2]?.trim() && trackMatch[3]?.trim()) {
      trackNum++
      tracks.push({
        position: trackMatch[1] ? parseInt(trackMatch[1]) : trackNum,
        artist: trackMatch[2].trim(),
        title: trackMatch[3].trim(),
        label: trackMatch[4]?.trim(),
      })
    }
  }

  return tracks
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function extractMetaContent(block: string, itemprop: string): string {
  const pattern = new RegExp(`itemprop="${itemprop}"[^>]*content="([^"]*)"`)
  const match = block.match(pattern)
  if (match) return match[1]

  const altPattern = new RegExp(`content="([^"]*)"[^>]*itemprop="${itemprop}"`)
  const altMatch = block.match(altPattern)
  return altMatch ? altMatch[1] : ''
}

function parseIsoDuration(duration: string): number | undefined {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(duration)
  if (!match) return undefined
  return (match[1] ? parseInt(match[1]) : 0) * 3600 +
         (match[2] ? parseInt(match[2]) : 0) * 60 +
         (match[3] ? parseFloat(match[3]) : 0)
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&uuml;/g, 'ü')
    .replace(/&sup2;/g, '²')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
}
