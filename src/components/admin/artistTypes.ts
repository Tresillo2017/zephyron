export interface Artist {
  id: string
  name: string
  slug: string
  image_url: string | null
  bio_summary: string | null
  tags: string | null
  listeners: number
  playcount: number
  lastfm_url: string | null
  last_synced_at: string | null
  set_count: number
  created_at: string
  source_1001_id?: string | null
  spotify_url?: string | null
  soundcloud_url?: string | null
  beatport_url?: string | null
  traxsource_url?: string | null
  youtube_url?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  x_url?: string | null
}

export type ArtistViewMode = 'list' | 'grid'

/** Parses the JSON-encoded tags column; returns [] for missing or malformed values. */
export function parseArtistTags(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function formatSetCount(count: number): string {
  return `${count} set${count !== 1 ? 's' : ''}`
}
