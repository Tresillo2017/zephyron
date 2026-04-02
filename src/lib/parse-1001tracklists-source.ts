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
