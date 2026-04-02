// Reusable social/service link icons for Artist and Event pages.
// Follows the same pattern as ServiceIconLink in services.tsx:
// bare icons with brand color, opacity hover, no background containers.
/* eslint-disable react-refresh/only-export-components */

import { SiSpotify, SiApplemusic, SiSoundcloud, SiBeatport, SiYoutube, SiBandcamp, SiFacebook, SiInstagram } from 'react-icons/si'
import { FaMusic, FaRecordVinyl } from 'react-icons/fa'
import { RiTwitterXFill } from 'react-icons/ri'
import type { IconType } from 'react-icons'

interface LinkDef {
  key: string
  label: string
  color: string
  Icon: IconType
  category: 'music' | 'social'
}

const LINK_DEFS: LinkDef[] = [
  // Music services
  { key: 'spotify_url', label: 'Spotify', color: '#1DB954', Icon: SiSpotify, category: 'music' },
  { key: 'apple_music_url', label: 'Apple Music', color: '#FA243C', Icon: SiApplemusic, category: 'music' },
  { key: 'soundcloud_url', label: 'SoundCloud', color: '#FF6100', Icon: SiSoundcloud, category: 'music' },
  { key: 'beatport_url', label: 'Beatport', color: '#94D500', Icon: SiBeatport, category: 'music' },
  { key: 'youtube_url', label: 'YouTube', color: '#FF0000', Icon: SiYoutube, category: 'music' },
  { key: 'deezer_url', label: 'Deezer', color: '#A238FF', Icon: FaMusic, category: 'music' },
  { key: 'bandcamp_url', label: 'Bandcamp', color: '#1DA0C3', Icon: SiBandcamp, category: 'music' },
  { key: 'traxsource_url', label: 'Traxsource', color: '#00D4FF', Icon: FaRecordVinyl, category: 'music' },
  { key: 'lastfm_url', label: 'Last.fm', color: '#D51007', Icon: FaMusic, category: 'music' },
  // Social links
  { key: 'facebook_url', label: 'Facebook', color: '#1877F2', Icon: SiFacebook, category: 'social' },
  { key: 'instagram_url', label: 'Instagram', color: '#E4405F', Icon: SiInstagram, category: 'social' },
  { key: 'x_url', label: 'X', color: 'hsl(var(--c2))', Icon: RiTwitterXFill, category: 'social' },
]

function getFilteredLinks(data: Record<string, unknown>, categories?: ('music' | 'social')[]) {
  return LINK_DEFS.filter((def) => {
    if (categories && !categories.includes(def.category)) return false
    const val = data[def.key]
    return val && typeof val === 'string' && val.trim().length > 0
  })
}

interface SocialLinksProps {
  /** Object with URL fields like spotify_url, facebook_url, etc. */
  data: Record<string, unknown>
  /** Which categories to show. Default: all */
  categories?: ('music' | 'social')[]
  /** Icon size in px. Default: 16 */
  size?: number
  /** Optional heading (renders in the standard card heading style) */
  heading?: string
}

/**
 * Renders a row of service/social icon links matching the app's design system.
 * Icons use brand colors at 70% opacity, scaling to 100% + scale on hover.
 * Same interaction pattern as ServiceIconLink in tracklist rows.
 */
export function SocialLinks({ data, categories, size = 16, heading }: SocialLinksProps) {
  const links = getFilteredLinks(data, categories)
  if (links.length === 0) return null

  return (
    <div>
      {heading && (
        <h3 className="text-[10px] font-mono tracking-wider mb-3" style={{ color: 'hsl(var(--c3))' }}>
          {heading}
        </h3>
      )}
      <div className="flex flex-wrap gap-1.5">
        {links.map((def) => {
          const url = data[def.key] as string
          return (
            <a
              key={def.key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={def.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs no-underline transition-all hover:brightness-125"
              style={{
                color: def.color,
                background: 'hsl(var(--b4) / 0.5)',
                boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)',
              }}
            >
              <def.Icon size={size} />
              <span style={{ color: 'hsl(var(--c2))' }}>{def.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

/** Get count of available links for a data object */
export function countSocialLinks(data: Record<string, unknown>, categories?: ('music' | 'social')[]): number {
  return getFilteredLinks(data, categories).length
}
