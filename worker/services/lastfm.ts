// Last.fm API client
// Provides track lookup, artist lookup, and track search

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'

export interface LastFmTrackInfo {
  name: string
  artist: string
  url: string
  mbid: string
  album: string | null
  albumArt: string | null
  durationMs: number
  listeners: number
  playcount: number
  tags: string[]
}

export interface LastFmArtistInfo {
  name: string
  url: string
  mbid: string
  imageUrl: string | null
  bioSummary: string
  bioFull: string
  tags: string[]
  similarArtists: { name: string; url: string }[]
  listeners: number
  playcount: number
}

/**
 * Look up a track on Last.fm by artist + title.
 * Uses autocorrect to handle misspellings.
 */
export async function lookupTrack(
  artist: string,
  title: string,
  apiKey: string
): Promise<LastFmTrackInfo | null> {
  const params = new URLSearchParams({
    method: 'track.getInfo',
    artist,
    track: title,
    api_key: apiKey,
    autocorrect: '1',
    format: 'json',
  })

  try {
    const resp = await fetch(`${LASTFM_API_BASE}?${params}`)
    if (!resp.ok) return null

    const data = await resp.json() as any
    if (data.error || !data.track) return null

    const track = data.track
    const images = track.album?.image || []
    const albumArt = images.find((i: any) => i.size === 'extralarge')?.['#text']
      || images.find((i: any) => i.size === 'large')?.['#text']
      || images.find((i: any) => i.size === 'medium')?.['#text']
      || null

    return {
      name: track.name || title,
      artist: track.artist?.name || artist,
      url: track.url || '',
      mbid: track.mbid || '',
      album: track.album?.title || null,
      albumArt: (albumArt && albumArt.length > 10) ? albumArt : null,
      durationMs: parseInt(track.duration) || 0,
      listeners: parseInt(track.listeners) || 0,
      playcount: parseInt(track.playcount) || 0,
      tags: (track.toptags?.tag || []).map((t: any) => t.name).slice(0, 5),
    }
  } catch (err) {
    console.error(`[lastfm] track.getInfo failed for "${artist} - ${title}":`, err)
    return null
  }
}

/**
 * Search for a track on Last.fm. Used as fallback when exact match fails.
 */
export async function searchTrack(
  query: string,
  apiKey: string,
  limit = 3
): Promise<LastFmTrackInfo[]> {
  const params = new URLSearchParams({
    method: 'track.search',
    track: query,
    api_key: apiKey,
    limit: String(limit),
    format: 'json',
  })

  try {
    const resp = await fetch(`${LASTFM_API_BASE}?${params}`)
    if (!resp.ok) return []

    const data = await resp.json() as any
    const tracks = data.results?.trackmatches?.track || []

    return tracks.map((t: any) => ({
      name: t.name || '',
      artist: t.artist || '',
      url: t.url || '',
      mbid: t.mbid || '',
      album: null,
      albumArt: (t.image || []).find((i: any) => i.size === 'large')?.['#text'] || null,
      durationMs: 0,
      listeners: parseInt(t.listeners) || 0,
      playcount: 0,
      tags: [],
    }))
  } catch {
    return []
  }
}

/**
 * Look up an artist on Last.fm.
 */
export async function lookupArtist(
  name: string,
  apiKey: string
): Promise<LastFmArtistInfo | null> {
  const params = new URLSearchParams({
    method: 'artist.getInfo',
    artist: name,
    api_key: apiKey,
    autocorrect: '1',
    format: 'json',
  })

  try {
    const resp = await fetch(`${LASTFM_API_BASE}?${params}`)
    if (!resp.ok) return null

    const data = await resp.json() as any
    if (data.error || !data.artist) return null

    const artist = data.artist
    const images = artist.image || []
    const imageUrl = images.find((i: any) => i.size === 'extralarge')?.['#text']
      || images.find((i: any) => i.size === 'large')?.['#text']
      || images.find((i: any) => i.size === 'medium')?.['#text']
      || ''

    // Last.fm deprecated their image CDN — detect the generic placeholder
    const isPlaceholder = imageUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')

    return {
      name: artist.name || name,
      url: artist.url || '',
      mbid: artist.mbid || '',
      imageUrl: isPlaceholder ? null : (imageUrl || null),
      bioSummary: artist.bio?.summary?.replace(/<[^>]*>/g, '').trim() || '',
      bioFull: artist.bio?.content?.replace(/<[^>]*>/g, '').trim() || '',
      tags: (artist.tags?.tag || []).map((t: any) => t.name).slice(0, 10),
      similarArtists: (artist.similar?.artist || []).slice(0, 5).map((a: any) => ({
        name: a.name || '',
        url: a.url || '',
      })),
      listeners: parseInt(artist.stats?.listeners) || 0,
      playcount: parseInt(artist.stats?.playcount) || 0,
    }
  } catch (err) {
    console.error(`[lastfm] artist.getInfo failed for "${name}":`, err)
    return null
  }
}
