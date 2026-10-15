import { Link } from 'react-router'
import { formatDuration } from '../../lib/formatTime'
import type { DjSet } from '../../lib/types'
import { Checkbox, Table, THead, TBody, Tr, Th, Td } from '../bleh'
import { AdminBadge, AdminButton } from './adminUi'

const SOURCE_LABELS: Record<string, string> = {
  invidious: 'YouTube',
  soundcloud: 'SoundCloud',
  hearthis: 'HearThis',
  r2: 'R2',
}

function getSourceLabel(set: DjSet): string {
  return SOURCE_LABELS[set.stream_type ?? ''] ?? 'None'
}

/** A set is "complete" when it has basics, a linked event, genre, source and finished detection. */
function isSetMetadataComplete(set: DjSet): boolean {
  const hasBasics = !!(set.title && set.artist)
  const hasEvent = !!set.event_id // Only complete if actually linked to an event entity
  const hasGenre = !!set.genre
  const streamType: string | null = set.stream_type
  const hasSource = !!(streamType && streamType !== "none")
  const hasDetection = set.detection_status === 'complete'
  return hasBasics && hasEvent && hasGenre && hasSource && hasDetection
}

/** Metadata completeness badge with a hover checklist. */
function CompletenessBadge({ set }: { set: DjSet }) {
  const complete = isSetMetadataComplete(set)
  return (
    <div
      className="group relative inline-block cursor-help"
      title={`Metadata: ${complete ? 'Complete' : 'Incomplete'} | Detection: ${set.detection_status}`}
    >
      <AdminBadge variant={complete ? 'accent' : 'muted'}>
        {complete ? 'Complete' : 'Incomplete'}
      </AdminBadge>
      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-b3 px-2 py-1.5 text-[11px] text-heading opacity-0 transition-opacity group-hover:opacity-100"
        style={{ boxShadow: 'var(--menu-shadow)' }}
      >
        <div className="text-left">
          <div>Event: {set.event_id ? '✓' : '✗'}</div>
          <div>Genre: {set.genre ? '✓' : '✗'}</div>
          <div>Source: {set.stream_type && (set.stream_type as string) !== "none" ? "✓" : "✗"}</div>
          <div>Detection: {set.detection_status}</div>
        </div>
      </div>
    </div>
  )
}

interface SetsTableProps {
  sets: DjSet[]
  viewMode: 'list' | 'grid'
  selectedIds: Set<string>
  allSelected: boolean
  onToggleAll: () => void
  onToggleOne: (id: string) => void
  onEdit: (set: DjSet) => void
}

export function SetsTable(props: SetsTableProps) {
  return props.viewMode === 'list' ? <SetsList {...props} /> : <SetsGrid {...props} />
}

function SetsList({ sets, selectedIds, allSelected, onToggleAll, onToggleOne, onEdit }: SetsTableProps) {
  return (
    <Table>
      <THead>
        <Tr>
          <Th className="w-8">
            <Checkbox checked={allSelected} onChange={onToggleAll} aria-label="Select all sets on this page" />
          </Th>
          <Th>Title / Artist</Th>
          <Th className="hidden w-24 text-center sm:table-cell">Genre</Th>
          <Th className="hidden w-20 text-center md:table-cell">Source</Th>
          <Th className="hidden w-20 text-center md:table-cell">Duration</Th>
          <Th className="w-28 text-center">Status</Th>
          <Th className="hidden w-14 text-right sm:table-cell">Plays</Th>
          <Th className="w-14"><span className="sr-only">Actions</span></Th>
        </Tr>
      </THead>
      <TBody>
        {sets.map((set) => {
          const isSelected = selectedIds.has(set.id)
          return (
            <Tr key={set.id} data-selected={isSelected ? '' : undefined}>
              <Td className="w-8">
                <Checkbox checked={isSelected} onChange={() => onToggleOne(set.id)} aria-label={`Select ${set.title}`} />
              </Td>
              <Td className="min-w-0">
                <Link to={`/app/sets/${set.id}`} className="group block min-w-0 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 rounded-sm">
                  <span className="block truncate text-[13px] text-heading group-hover:underline">{set.title}</span>
                  <span className="flex items-center gap-2 text-[12px] text-muted">
                    <span className="truncate">{set.artist}</span>
                    {set.event && <span className="hidden max-w-28 truncate text-[11px] opacity-70 lg:inline">{set.event}</span>}
                  </span>
                </Link>
              </Td>
              <Td className="hidden text-center sm:table-cell">
                {set.genre ? <AdminBadge variant="muted">{set.genre}</AdminBadge> : <span className="text-[12px] text-muted">—</span>}
              </Td>
              <Td className="hidden text-center md:table-cell">
                <span className={getSourceLabel(set) === 'None' ? 'text-[11px] text-error' : 'text-[11px] text-muted'}>
                  {getSourceLabel(set)}
                </span>
              </Td>
              <Td className="hidden text-center font-mono text-[12px] text-muted tabular-nums md:table-cell">
                {formatDuration(set.duration_seconds)}
              </Td>
              <Td className="text-center"><CompletenessBadge set={set} /></Td>
              <Td className="hidden text-right font-mono text-[12px] text-muted tabular-nums sm:table-cell">
                {set.play_count > 0 ? set.play_count : '—'}
              </Td>
              <Td className="text-right">
                <AdminButton variant="ghost" size="sm" onClick={() => onEdit(set)} aria-label={`Edit ${set.title}`}>
                  Edit
                </AdminButton>
              </Td>
            </Tr>
          )
        })}
      </TBody>
    </Table>
  )
}

function SetsGrid({ sets, selectedIds, onToggleOne, onEdit }: SetsTableProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {sets.map((set) => {
        const isSelected = selectedIds.has(set.id)
        return (
          <div
            key={set.id}
            className="relative flex flex-col gap-3 rounded-card bg-b4/40 p-4 shadow-inset"
            data-selected={isSelected ? '' : undefined}
          >
            <div className="absolute right-3 top-3">
              <Checkbox checked={isSelected} onChange={() => onToggleOne(set.id)} aria-label={`Select ${set.title}`} />
            </div>
            <Link to={`/app/sets/${set.id}`} className="group block pr-8 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 rounded-sm">
              <span className="block text-[15px] text-heading group-hover:underline">{set.title}</span>
              <span className="mt-1 block text-[13px] text-text">{set.artist}</span>
              {set.event && <span className="block truncate text-[12px] text-muted">{set.event}</span>}
            </Link>
            <div className="flex flex-wrap gap-2">
              {set.genre && <AdminBadge variant="muted">{set.genre}</AdminBadge>}
              <CompletenessBadge set={set} />
            </div>
            <div className="flex items-center justify-between text-[12px] text-muted">
              <span className="font-mono tabular-nums">{formatDuration(set.duration_seconds)}</span>
              <span>{getSourceLabel(set)}</span>
              <span>{set.play_count > 0 ? `${set.play_count} plays` : '—'}</span>
            </div>
            <AdminButton variant="ghost" size="sm" onClick={() => onEdit(set)} className="w-full justify-center" aria-label={`Edit ${set.title}`}>
              Edit
            </AdminButton>
          </div>
        )
      })}
    </div>
  )
}
