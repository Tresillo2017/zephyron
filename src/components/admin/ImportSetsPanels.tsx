import { VideoFilled } from '@mingcute/react/core-filled'
import { Checkbox, Table, THead, TBody, Tr, Th, Td, textareaClass } from '../bleh'
import { AdminBadge, AdminButton } from './adminUi'
import type { ImportableSet, ImportStatus, SetImportState } from './ImportSetsModal'

const CODE_CLASS = 'rounded bg-accent-2/10 px-1 py-0.5 font-mono text-[11px] text-accent-2'
const KBD_CLASS = 'rounded bg-b3/50 px-1 py-0.5 font-mono text-[11px] text-text'

const IN_PROGRESS_LABEL: Partial<Record<SetImportState, string>> = {
  creating: 'Creating...',
  linking: 'Linking...',
  fetching_tl: 'Tracks...',
  importing_tl: 'Saving...',
}

export function ManualPastePanel({ sourceId, manualHtml, onManualHtmlChange, onParse, onRetry }: {
  sourceId: string | null
  manualHtml: string
  onManualHtmlChange: (html: string) => void
  onParse: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5 rounded-lg bg-b4/20 px-3 py-2.5">
        <p className="text-[12px] font-medium text-text">How to get the full page source:</p>
        <ol className="list-inside list-decimal space-y-1 text-[12px] text-muted">
          <li>
            Go to{' '}
            <code className={CODE_CLASS}>1001tracklists.com/source/{sourceId || '...'}/</code>
          </li>
          <li>Scroll down until all sets are loaded (click &quot;Show More&quot; if needed)</li>
          <li>
            Open browser console (<kbd className={KBD_CLASS}>F12</kbd> {'>'} Console) and run:{' '}
            <code className={CODE_CLASS + ' select-all'}>copy(document.documentElement.outerHTML)</code>
          </li>
          <li>Paste below (the full page with all sets will be in your clipboard)</li>
        </ol>
        <p className="text-[11px] text-muted">
          Note: &quot;View Page Source&quot; (Ctrl+U) only gets the first ~14 sets. The console method above gets all of them.
        </p>
      </div>
      <textarea
        value={manualHtml}
        onChange={(e) => onManualHtmlChange(e.target.value)}
        rows={4}
        placeholder="Paste event source page HTML..."
        className={textareaClass + ' resize-none font-mono text-[12px]'}
      />
      <div className="flex gap-2">
        <AdminButton variant="secondary" size="sm" onClick={onParse} disabled={!manualHtml.trim()}>
          Parse HTML
        </AdminButton>
        {sourceId && (
          <AdminButton variant="ghost" size="sm" onClick={onRetry}>Retry auto-fetch</AdminButton>
        )}
      </div>
    </div>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h${rest}m` : `${hours}h`
}

function ImportStateCell({ entry }: { entry: ImportableSet }) {
  if (entry.importState === 'done') return <span className="text-success">Done</span>
  if (entry.importState === 'error') {
    return <span className="text-error" title={entry.importError}>Failed</span>
  }
  const label = IN_PROGRESS_LABEL[entry.importState]
  return label ? <span className="text-accent-2">{label}</span> : null
}

function rowToneClass(entry: ImportableSet): string | undefined {
  if (entry.importState === 'done') return 'opacity-60'
  if (entry.importState === 'error') return 'bg-error/5'
  return entry.selected ? 'bg-b4/15' : undefined
}

function ImportEntryRow({ entry, index, busy, onToggle }: {
  entry: ImportableSet; index: number; busy: boolean; onToggle: (index: number) => void
}) {
  return (
    <Tr className={rowToneClass(entry)}>
      <Td className="w-8 py-2">
        <Checkbox
          checked={entry.selected}
          onChange={() => onToggle(index)}
          disabled={entry.importState === 'done' || busy}
          aria-label={`Select ${entry.artist}`}
        />
      </Td>
      <Td className="min-w-0 py-2">
        <p className="truncate text-[13px] font-medium text-heading">{entry.artist}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          {entry.stage && <span className="truncate">@ {entry.stage}</span>}
          {entry.date && <span className="font-mono">{entry.date}</span>}
          {entry.genre && <span className={CODE_CLASS}>{entry.genre}</span>}
        </div>
      </Td>
      <Td className="whitespace-nowrap py-2 text-right font-mono text-[11px] tabular-nums text-muted">
        <div className="flex items-center justify-end gap-1.5">
          {entry.duration_minutes ? <span>{formatDuration(entry.duration_minutes)}</span> : null}
          {entry.tracks_total ? (
            <span>
              {entry.tracks_identified !== undefined ? `${entry.tracks_identified}/${entry.tracks_total}` : entry.tracks_total} tracks
            </span>
          ) : null}
          {entry.has_video && (
            <>
              <VideoFilled size={12} aria-hidden="true" />
              <span className="sr-only">Has video</span>
            </>
          )}
        </div>
      </Td>
      <Td className="w-24 py-2 text-right text-[11px]">
        <ImportStateCell entry={entry} />
      </Td>
    </Tr>
  )
}

export function ImportEntriesTable({ entries, status, doneCount, errorCount, allSelected, onRepaste, onToggleAll, onToggle }: {
  entries: ImportableSet[]
  status: ImportStatus
  doneCount: number
  errorCount: number
  allSelected: boolean
  onRepaste: () => void
  onToggleAll: () => void
  onToggle: (index: number) => void
}) {
  const busy = status === 'importing'
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-medium text-heading">{entries.length} sets found</span>
          {doneCount > 0 && <AdminBadge variant="accent">{doneCount} imported</AdminBadge>}
          {errorCount > 0 && <AdminBadge tone="error">{errorCount} failed</AdminBadge>}
        </div>
        {!busy && (
          <div className="flex items-center gap-2">
            <AdminButton variant="ghost" size="sm" onClick={onRepaste}>Re-paste</AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={onToggleAll}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </AdminButton>
          </div>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        <Table>
          <THead>
            <Tr>
              <Th className="w-8"><span className="sr-only">Select</span></Th>
              <Th>Set</Th>
              <Th className="w-28 text-right">Details</Th>
              <Th className="w-24 text-right">Status</Th>
            </Tr>
          </THead>
          <TBody>
            {entries.map((entry, index) => (
              <ImportEntryRow key={entry.tracklist_id} entry={entry} index={index} busy={busy} onToggle={onToggle} />
            ))}
          </TBody>
        </Table>
      </div>
    </>
  )
}

export function ImportProgressBar({ progress }: { progress: { current: number; total: number } }) {
  const ratio = progress.current / progress.total
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[12px]">
        <span className="text-text">Importing set {progress.current} of {progress.total}...</span>
        <span className="tabular-nums text-muted">{Math.round(ratio * 100)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Import progress"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.current}
        className="h-1.5 overflow-hidden rounded-full bg-b4/30"
      >
        <div className="h-full rounded-full bg-accent-2 transition-[width] duration-300 ease-bleh" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}
