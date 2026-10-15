import { Input, Select } from '../bleh'
import { GENRES } from '../../lib/constants'
import { AdminButton } from './adminUi'

const STREAM_TYPE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'invidious', label: 'YouTube' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'hearthis', label: 'HearThis' },
  { value: 'r2', label: 'R2 Upload' },
  { value: 'none', label: 'No Source' },
] as const

export const DETECTION_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'complete', label: 'Complete' },
  { value: 'failed', label: 'Failed' },
] as const

const SORT_OPTIONS_ADMIN = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most Played' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'artist', label: 'Artist A-Z' },
  { value: 'duration', label: 'Longest' },
] as const

const GENRE_OPTIONS = [{ value: '', label: 'All Genres' }, ...GENRES.map((g) => ({ value: g, label: g }))]
const HAS_SOURCE_OPTIONS = [
  { value: '', label: 'Any Source' },
  { value: 'true', label: 'Has Source' },
  { value: 'false', label: 'No Source' },
]

interface SetsFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  genre: string
  onGenreChange: (value: string) => void
  streamType: string
  onStreamTypeChange: (value: string) => void
  detectionStatus: string
  onDetectionStatusChange: (value: string) => void
  hasSource: string
  onHasSourceChange: (value: string) => void
  activeFilterCount: number
  onClearFilters: () => void
}

/** Search box, sort and filter selects for the sets list. */
export function SetsFilters(p: SetsFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-card bg-b4/40 p-3 shadow-inset">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <Input

            aria-label="Search sets"
            value={p.search}
            onChange={(e) => p.onSearchChange(e.target.value)}
            placeholder="Search by title, artist, event, venue..."
          />
        </div>
        <Select label="Sort sets" value={p.sort} options={[...SORT_OPTIONS_ADMIN]} onChange={p.onSortChange} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select label="Filter by genre" value={p.genre} options={GENRE_OPTIONS} onChange={p.onGenreChange} />
        <Select label="Filter by source" value={p.streamType} options={[...STREAM_TYPE_OPTIONS]} onChange={p.onStreamTypeChange} />
        <Select label="Filter by detection status" value={p.detectionStatus} options={[...DETECTION_OPTIONS]} onChange={p.onDetectionStatusChange} />
        <Select label="Filter by has source" value={p.hasSource} options={HAS_SOURCE_OPTIONS} onChange={p.onHasSourceChange} />
        {p.activeFilterCount > 0 && (
          <AdminButton variant="ghost" size="sm" onClick={p.onClearFilters}>Clear filters</AdminButton>
        )}
      </div>
    </div>
  )
}
