import type { Detection, DjSetWithDetections } from '../../lib/types'

export type SetArtistInfo = NonNullable<DjSetWithDetections['artist_info']>
export type SetArtist = NonNullable<DjSetWithDetections['set_artists']>[number]

/** Set payload plus the optional `source_url` returned for external (SoundCloud / HearThis) sets. */
export type SetWithSource = DjSetWithDetections & { source_url?: string | null }

export interface DetectionGroup {
  primary: Detection
  withTracks: Detection[]
}

/** Max start-time gap (seconds) for a detection to join the previous group. */
const GROUP_WINDOW_SECONDS = 2

/** Groups detections whose start times fall within the window of the group's primary track. */
export function groupDetections(detections: Detection[]): DetectionGroup[] {
  const groups: DetectionGroup[] = []
  for (const detection of detections) {
    const lastGroup = groups[groups.length - 1]
    if (
      lastGroup &&
      Math.abs(detection.start_time_seconds - lastGroup.primary.start_time_seconds) <= GROUP_WINDOW_SECONDS
    ) {
      lastGroup.withTracks.push(detection)
    } else {
      groups.push({ primary: detection, withTracks: [] })
    }
  }
  return groups
}

/** Parses the artist's JSON tag list; malformed JSON yields no tags. */
export function parseArtistTags(raw: string | null | undefined): string[] {
  try {
    return JSON.parse(raw || '[]') as string[]
  } catch {
    return []
  }
}
