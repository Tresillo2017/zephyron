// Streaming service definitions with react-icons brand icons.
// Single source of truth for all service metadata across the app.
/* eslint-disable react-refresh/only-export-components */

import type { Song } from './types'
import type { IconType } from 'react-icons'
import { SiSpotify, SiApplemusic, SiSoundcloud, SiBeatport, SiYoutube, SiBandcamp } from 'react-icons/si'
import { FaMusic, FaRecordVinyl } from 'react-icons/fa'

export interface ServiceInfo {
  key: keyof Song
  label: string
  color: string
  placeholder: string
  Icon: IconType
}

export const SERVICES: ServiceInfo[] = [
  { key: 'spotify_url', label: 'Spotify', color: '#1DB954', placeholder: 'https://open.spotify.com/track/...', Icon: SiSpotify },
  { key: 'apple_music_url', label: 'Apple Music', color: '#FA243C', placeholder: 'https://music.apple.com/...', Icon: SiApplemusic },
  { key: 'soundcloud_url', label: 'SoundCloud', color: '#FF6100', placeholder: 'https://soundcloud.com/...', Icon: SiSoundcloud },
  { key: 'beatport_url', label: 'Beatport', color: '#94D500', placeholder: 'https://www.beatport.com/...', Icon: SiBeatport },
  { key: 'youtube_url', label: 'YouTube', color: '#FF0000', placeholder: 'https://youtube.com/watch?v=...', Icon: SiYoutube },
  { key: 'deezer_url', label: 'Deezer', color: '#A238FF', placeholder: 'https://www.deezer.com/track/...', Icon: FaMusic },
  { key: 'bandcamp_url', label: 'Bandcamp', color: '#1DA0C3', placeholder: 'https://....bandcamp.com/...', Icon: SiBandcamp },
  { key: 'traxsource_url', label: 'Traxsource', color: '#00D4FF', placeholder: 'https://www.traxsource.com/...', Icon: FaRecordVinyl },
]

/** Small service icon */
export function ServiceIcon({ service, size = 16, className = '' }: { service: ServiceInfo; size?: number; className?: string }) {
  const { Icon, color } = service
  return <Icon size={size} color={color} className={className} style={{ opacity: 0.85 }} />
}

/** Clickable service icon link */
export function ServiceIconLink({ url, service, size = 16 }: { url: string; service: ServiceInfo; size?: number }) {
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      title={service.label}
      className="inline-flex items-center justify-center transition-all hover:scale-125 hover:opacity-100 opacity-70"
      onClick={(e) => e.stopPropagation()}
    >
      <ServiceIcon service={service} size={size} />
    </a>
  )
}

/** Get SERVICES entries that have a URL set on the given object */
export function getAvailableServices(obj: Record<string, unknown>): Array<{ url: string; service: ServiceInfo }> {
  const available: Array<{ url: string; service: ServiceInfo }> = []
  for (const svc of SERVICES) {
    const url = obj[svc.key]
    if (url && typeof url === 'string') {
      available.push({ url, service: svc })
    }
  }
  return available
}
