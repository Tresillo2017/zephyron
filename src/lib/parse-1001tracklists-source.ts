/**
 * Client-side parser for 1001Tracklists source (event) and DJ (artist) pages.
 * Pure regex/string — no DOM APIs, works in both browser and Worker contexts.
 *
 * Event pages: https://www.1001tracklists.com/source/{id}/{slug}/index.html
 * Artist pages: https://www.1001tracklists.com/dj/{slug}/index.html
 */

export interface Event1001Parsed {
  name: string
  series?: string
  type?: string
  location?: string
  website?: string
  facebook_url?: string
  instagram_url?: string
  youtube_url?: string
  x_url?: string
  cover_image_url?: string
  source_id?: string
  tracklist_count?: number
}

export interface Artist1001Parsed {
  name: string
  image_url?: string
  country?: string
  spotify_url?: string
  soundcloud_url?: string
  beatport_url?: string
  apple_music_url?: string
  traxsource_url?: string
  youtube_url?: string
  facebook_url?: string
  instagram_url?: string
  x_url?: string
  dj_id?: string
  tracklist_count?: number
}

// ═══════════════════════════════════════════
// Event set entry (from event overview pages)
// ═══════════════════════════════════════════

export interface EventSetEntry {
  tracklist_id: string
  title: string           // full title from link text
  artist: string          // extracted before "@" or "—"
  stage?: string          // extracted after "@"
  date?: string           // YYYY-MM-DD from fa-calendar
  genre?: string          // from fa-music
  duration_minutes?: number
  tracks_identified?: number
  tracks_total?: number
  has_video?: boolean
  has_audio?: boolean
  tracklist_url: string   // relative or absolute link to tracklist page
}

/**
 * Parse the set listing entries from a 1001Tracklists event overview page.
 * These pages list all tracklists associated with an event source.
 * Each entry is a <div class="bItm oItm" data-id="TLID">.
 *
 * Important: The full JS-rendered page may also contain `bItm tlpItem` entries
 * (track rows inside expanded tracklist previews) — those must be excluded.
 * We specifically target `oItm` class which is unique to the event listing entries.
 */
export function parse1001EventSetsHtml(html: string): EventSetEntry[] {
  const entries: EventSetEntry[] = []

  // Strategy: find all positions where an oItm block starts, then extract content between them.
  // oItm blocks are set listing entries on event source pages.
  // They look like: <div class="bItm action oItm" data-id="TLID">
  // We avoid matching `bItm tlpItem` (track rows) or plain `bItm` without oItm.

  // Find all oItm block start positions and their data-ids
  const blockStarts: Array<{ index: number; dataId: string }> = []
  const startPattern = /<div[^>]*class="[^"]*oItm[^"]*"[^>]*data-id="([^"]+)"[^>]*>/gi
  let startMatch
  while ((startMatch = startPattern.exec(html)) !== null) {
    blockStarts.push({ index: startMatch.index, dataId: startMatch[1] })
  }

  // Also try the reverse order: data-id before class (some pages may vary)
  const altPattern = /<div[^>]*data-id="([^"]+)"[^>]*class="[^"]*oItm[^"]*"[^>]*>/gi
  let altMatch
  while ((altMatch = altPattern.exec(html)) !== null) {
    // Avoid duplicates
    if (!blockStarts.some((b) => b.dataId === altMatch![1])) {
      blockStarts.push({ index: altMatch.index, dataId: altMatch[1] })
    }
  }

  // Sort by position in document
  blockStarts.sort((a, b) => a.index - b.index)

  if (blockStarts.length === 0) {
    // Fallback: try without oItm requirement — look for bItm blocks that contain /tracklist/ links
    // This handles edge cases where the oItm class isn't used
    const fallbackPattern = /<div[^>]*class="[^"]*bItm(?![^"]*tlpItem)[^"]*"[^>]*data-id="([^"]+)"[^>]*>/gi
    let fbMatch
    while ((fbMatch = fallbackPattern.exec(html)) !== null) {
      blockStarts.push({ index: fbMatch.index, dataId: fbMatch[1] })
    }
    blockStarts.sort((a, b) => a.index - b.index)
  }

  // Extract blocks: each block goes from its start position to the next block's start (or end of document)
  for (let i = 0; i < blockStarts.length; i++) {
    const start = blockStarts[i]
    const end = i + 1 < blockStarts.length ? blockStarts[i + 1].index : html.length
    const block = html.substring(start.index, end)
    const dataId = start.dataId

    // Extract tracklist link — <a href="/tracklist/TLID/slug.html">TITLE</a>
    const linkMatch = block.match(/<a\s+href="(\/tracklist\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!linkMatch) continue

    const tracklist_url = linkMatch[1]
    const rawTitle = linkMatch[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim()

    // Extract tracklist_id from URL or data-id
    const idMatch = tracklist_url.match(/\/tracklist\/([a-z0-9]+)/i)
    const tracklist_id = idMatch?.[1] || dataId

    // Parse artist and stage from title
    // Typical format: "Artist @ Stage, City, Country" or "Artist — Title"
    let artist = rawTitle
    let stage: string | undefined

    const atMatch = rawTitle.match(/^(.+?)\s*@\s*(.+)$/)
    if (atMatch) {
      artist = atMatch[1].trim()
      stage = atMatch[2].trim()
    } else {
      const dashMatch = rawTitle.match(/^(.+?)\s*[—–]\s*(.+)$/)
      if (dashMatch) {
        artist = dashMatch[1].trim()
      }
    }

    // Date — <i class="fa fa-calendar..."></i> followed by date text
    let date: string | undefined
    const dateMatch = block.match(/fa-calendar[^>]*><\/i>\s*([^<]+)/)
    if (dateMatch) {
      const dateStr = dateMatch[1].trim()
      // Try to parse various date formats: "2025-03-30", "30 Mar 2025", etc.
      const isoMatch = dateStr.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/)
      if (isoMatch) {
        date = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
      } else {
        // Try "DD Mon YYYY" or "Mon DD, YYYY" parsing
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
          date = parsed.toISOString().split('T')[0]
        }
      }
    }

    // Genre — <i class="fa fa-music..."></i> followed by genre text
    let genre: string | undefined
    const genreMatch = block.match(/fa-music[^>]*><\/i>\s*([^<]+)/)
    if (genreMatch) {
      genre = genreMatch[1].trim()
    }

    // Duration — <i class="fa fa-clock-o..."></i> followed by "Xh Ym" or "Xm"
    let duration_minutes: number | undefined
    const durationMatch = block.match(/fa-clock[^>]*><\/i>\s*([^<]+)/)
    if (durationMatch) {
      const durStr = durationMatch[1].trim()
      const hourMin = durStr.match(/(\d+)h\s*(\d+)?m?/)
      const minOnly = durStr.match(/^(\d+)m$/)
      if (hourMin) {
        duration_minutes = parseInt(hourMin[1]) * 60 + (parseInt(hourMin[2] || '0'))
      } else if (minOnly) {
        duration_minutes = parseInt(minOnly[1])
      }
    }

    // Track count — <i class="fa fa-check..."></i> followed by "X/Y" or "X"
    let tracks_identified: number | undefined
    let tracks_total: number | undefined
    const trackMatch = block.match(/fa-check[^>]*><\/i>\s*([^<]+)/)
    if (trackMatch) {
      const trackStr = trackMatch[1].trim()
      const slashMatch = trackStr.match(/(\d+)\s*\/\s*(\d+)/)
      if (slashMatch) {
        tracks_identified = parseInt(slashMatch[1])
        tracks_total = parseInt(slashMatch[2])
      } else {
        const numMatch = trackStr.match(/(\d+)/)
        if (numMatch) {
          tracks_total = parseInt(numMatch[1])
        }
      }
    }

    // Has video — fa-video-camera or fa-video icon
    const has_video = /fa-video/.test(block)

    // Has premium audio — fa-star icon
    const has_audio = /fa-star/.test(block)

    entries.push({
      tracklist_id,
      title: rawTitle,
      artist,
      stage,
      date,
      genre,
      duration_minutes,
      tracks_identified,
      tracks_total,
      has_video,
      has_audio,
      tracklist_url,
    })
  }

  return entries
}

// ═══════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════

/** Extract text content from first match of a regex (strips HTML tags) */
function extractText(html: string, pattern: RegExp): string | undefined {
  const m = html.match(pattern)
  if (!m) return undefined
  return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim()
}

/** Extract href from first link matching a pattern */
function extractHref(html: string, pattern: RegExp): string | undefined {
  const m = html.match(pattern)
  return m?.[1]?.trim()
}

/** Extract the CSS background-image URL from #artworkLeft or #artworkTop */
function extractArtworkUrl(html: string): string | undefined {
  // Try #artworkLeft first (min-width: 800px version — better quality)
  const leftMatch = html.match(/#artworkLeft\s*\{[^}]*background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i)
  if (leftMatch?.[1]) return leftMatch[1]

  // Fallback to #artworkTop
  const topMatch = html.match(/#artworkTop\s*\{[^}]*background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i)
  if (topMatch?.[1]) return topMatch[1]

  // Try og:image meta tag as last resort
  const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)
  return ogMatch?.[1]
}

/** Extract tracklist count from the badge next to the name in #csLeft */
function extractTracklistCount(html: string): number | undefined {
  // Badge text like: <span class="badge spL hO" title="number of tracklists"> 1,521 </span>
  const m = html.match(/title="number of tracklists"[^>]*>\s*([\d,]+)\s*</)
  if (!m) return undefined
  return parseInt(m[1].replace(/,/g, ''), 10)
}

/** Extract country from flag image alt attribute */
function extractCountry(html: string): string | undefined {
  // <img src="/images/flags/us.png" ... alt="United States" title="Home Country United States"
  const m = html.match(/\/images\/flags\/[a-z]+\.png[^>]*alt="([^"]+)"[^>]*title="Home Country/)
  if (m) return m[1]
  // Fallback: first flag without "Home Country" qualifier
  const m2 = html.match(/\/images\/flags\/[a-z]+\.png[^>]*alt="([^"]+)"/)
  return m2?.[1]
}

/**
 * Parse a 1001Tracklists event/source page HTML.
 * Works with /source/{id}/{slug}/index.html pages.
 */
export function parseEventSourceHtml(html: string): Event1001Parsed {
  // Name from #pageTitle h1
  const name = extractText(html, /<div\s+id="pageTitle"[^>]*>.*?<h1[^>]*>\s*(.*?)\s*(?:Tracklists Overview)?\s*<\/h1>/s)
    ?? extractText(html, /<h1[^>]*class="notranslate"[^>]*>\s*(.*?)\s*<\/h1>/)
    ?? 'Unknown Event'

  // Clean " Tracklists Overview" suffix if present
  const cleanName = name.replace(/\s*Tracklists Overview\s*$/i, '').trim()

  // Artwork
  const cover_image_url = extractArtworkUrl(html)

  // Tracklist count
  const tracklist_count = extractTracklistCount(html)

  // Source ID from og:url: /source/u8bf5c/...
  const sourceIdMatch = html.match(/\/source\/([a-z0-9]+)\//)
  const source_id = sourceIdMatch?.[1]

  // Event type (e.g. "Open Air / Festival")
  // Appears as plain text in .cRow within #csLeft
  const typeMatch = html.match(/<div class="cRow">\s*<div class="mtb5">([^<]+)<\/div>/)
  const type = typeMatch?.[1]?.trim()

  // Series from "Promoted By" link
  const seriesMatch = html.match(/Promoted By\s*<a[^>]+>([^<]+)<\/a>/i)
  const series = seriesMatch?.[1]?.trim()

  // Location from flag alt in the header section (country-level only from source pages)
  // Event source pages don't have fine-grained location, just country via flag
  const countryMatch = html.match(/class="flag"[^>]*alt="([^"]+)"/)
  const location = countryMatch?.[1]

  // Social/service links from #csLeft .fTab .cRow links
  const website = extractHref(html, /class="[^"]*fa-globe[^"]*"[^>]*><\/i>.*?<\/i>\s*(?:Website)?<\/a>.*?(?=<\/a>)|href="(https?:\/\/[^"]+)"[^>]*>.*?fa-globe/)
    // Better approach: find the href of the link containing fa-globe
    ?? (() => {
      const m = html.match(/href="(https?:\/\/[^"]+)"[^>]*>\s*<i[^>]*fa-globe[^>]*>/)
      return m?.[1]
    })()

  const facebook_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"[^>]*>\s*<i[^>]*fa-facebook/)
    return m?.[1]
  })()

  const instagram_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"[^>]*>\s*<i[^>]*fa-instagram/)
    return m?.[1]
  })()

  const youtube_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"[^>]*>\s*<i[^>]*fa-youtube/)
    return m?.[1]
  })()

  const x_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:x\.com|twitter\.com)\/[^"]+)"[^>]*>\s*<i[^>]*fa-x/)
    return m?.[1]
  })()

  return {
    name: cleanName,
    series,
    type,
    location,
    website,
    facebook_url,
    instagram_url,
    youtube_url,
    x_url,
    cover_image_url,
    source_id,
    tracklist_count,
  }
}

/**
 * Parse a 1001Tracklists DJ/artist page HTML.
 * Works with /dj/{slug}/index.html pages.
 */
export function parseArtistSourceHtml(html: string): Artist1001Parsed {
  // Name from #pageTitle h1
  const rawName = extractText(html, /<h1[^>]*class="notranslate"[^>]*>\s*(.*?)\s*<\/h1>/)
    ?? extractText(html, /<div\s+id="pageTitle"[^>]*>.*?<h1[^>]*>\s*(.*?)\s*<\/h1>/s)
    ?? 'Unknown Artist'
  const name = rawName.replace(/\s*Tracklists Overview\s*$/i, '').trim()

  // Artwork
  const image_url = extractArtworkUrl(html)

  // Country
  const country = extractCountry(html)

  // DJ short-link ID from the Share section: href="https://1001.tl/3xl6vcu"
  const djIdMatch = html.match(/href="https:\/\/1001\.tl\/([a-z0-9]+)"/)
  const dj_id = djIdMatch?.[1]

  // Tracklist count
  const tracklist_count = extractTracklistCount(html)

  // Service links — each pattern looks for the link whose href contains the service domain
  // or whose inner icon has the known FA class

  const spotify_url = (() => {
    const m = html.match(/href="(https?:\/\/open\.spotify\.com\/artist\/[^"]+)"/)
    return m?.[1]
  })()

  const soundcloud_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?soundcloud\.com\/[^"]+)"[^>]*>\s*<i[^>]*fa-soundcloud/)
    return m?.[1]
  })()

  const beatport_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?beatport\.com\/artist\/[^"]+)"/)
    return m?.[1]
  })()

  const apple_music_url = (() => {
    const m = html.match(/href="(https?:\/\/music\.apple\.com\/[^"]+)"/)
    return m?.[1]
  })()

  const traxsource_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?traxsource\.com\/artist\/[^"]+)"/)
    return m?.[1]
  })()

  const youtube_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/(?:channel|c|user)\/[^"]+)"[^>]*>\s*<i[^>]*fa-youtube/)
    return m?.[1]
  })()

  const facebook_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"[^>]*>\s*<i[^>]*fa-facebook/)
    return m?.[1]
  })()

  const instagram_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"[^>]*>\s*<i[^>]*fa-instagram/)
    return m?.[1]
  })()

  const x_url = (() => {
    const m = html.match(/href="(https?:\/\/(?:x\.com|twitter\.com)\/[^"]+)"[^>]*>\s*<i[^>]*fa-x/)
    return m?.[1]
  })()

  return {
    name,
    image_url,
    country,
    spotify_url,
    soundcloud_url,
    beatport_url,
    apple_music_url,
    traxsource_url,
    youtube_url,
    facebook_url,
    instagram_url,
    x_url,
    dj_id,
    tracklist_count,
  }
}
