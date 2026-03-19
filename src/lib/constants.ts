export const GENRES = [
  'Techno',
  'House',
  'Trance',
  'Drum & Bass',
  'Dubstep',
  'Garage',
  'Ambient',
  'Breaks',
  'Electro',
  'Minimal',
  'Progressive',
  'Hardstyle',
  'Downtempo',
  'Disco',
  'Acid',
  'Industrial',
] as const

export type GenreName = (typeof GENRES)[number]

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Played' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title', label: 'Title A-Z' },
] as const

export const DETECTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting Analysis',
  processing: 'Analyzing...',
  complete: 'Tracks Detected',
  failed: 'Analysis Failed',
}
