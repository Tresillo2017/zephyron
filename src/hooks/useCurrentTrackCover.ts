import { usePlayerStore } from '../stores/playerStore'
import { getSongCoverUrl, getCoverUrl } from '../lib/api'
import type { Detection } from '../lib/types'

function resolveCover(d: Detection | null, fallback: string | null): string | null {
  if (!d?.song) return fallback
  return d.song.cover_art_r2_key ? getSongCoverUrl(d.song.id) : d.song.cover_art_url || d.song.lastfm_album_art || fallback
}

/** Get the best cover URL for the current track (for FullScreenPlayer background) */
export function useCurrentTrackCover(): string | null {
  const { currentSet, currentDetection } = usePlayerStore()
  return resolveCover(currentDetection, currentSet?.cover_image_r2_key ? getCoverUrl(currentSet.id) : null)
}
