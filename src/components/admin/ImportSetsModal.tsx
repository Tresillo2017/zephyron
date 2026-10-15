import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchEvent1001Sets, fetchArtists, createArtistAdmin, adminCreateSet, linkSetToEvent, fetch1001Tracklists, import1001Tracklists } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { parse1001EventSetsHtml, type EventSetEntry } from '../../lib/parse-1001tracklists-source'
import type { Event } from './eventTypes'

// ═══════════════════════════════════════════
// Import Sets from 1001Tracklists modal
// ═══════════════════════════════════════════

type ImportStatus = 'idle' | 'fetching' | 'parsed' | 'importing'
type SetImportState = 'pending' | 'creating' | 'linking' | 'fetching_tl' | 'importing_tl' | 'done' | 'error'

interface ImportableSet extends EventSetEntry {
  selected: boolean
  importState: SetImportState
  importError?: string
}

export function ImportSetsModal({ event, onClose, onImported }: { event: Event; onClose: () => void; onImported: () => void }) {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [entries, setEntries] = useState<ImportableSet[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [manualHtml, setManualHtml] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const abortRef = useRef(false)

  const parseHtml = useCallback((html: string) => {
    try {
      const parsed = parse1001EventSetsHtml(html)
      if (parsed.length === 0) {
        setFetchError('No set entries found in the HTML. Make sure you pasted the full event source page.')
        setStatus('idle')
        return
      }
      setEntries(parsed.map((e) => ({ ...e, selected: true, importState: 'pending' as SetImportState })))
      setStatus('parsed')
      setFetchError(null)
    } catch (err) {
      setFetchError(`Parse failed: ${err instanceof Error ? err.message : String(err)}`)
      setStatus('idle')
    }
  }, [])

  const autoFetch = useCallback(async () => {
    setStatus('fetching')
    setFetchError(null)
    try {
      const res = await fetchEvent1001Sets(event.id)
      if (res.ok && res.data.html) {
        parseHtml(res.data.html)
        setShowManual(false)
      } else {
        setFetchError(res.error || 'Auto-fetch blocked by Turnstile. Use manual paste below.')
        setStatus('idle')
      }
    } catch (err) {
      setFetchError(`Auto-fetch blocked: ${err instanceof Error ? err.message : String(err)}`)
      setStatus('idle')
    }
  }, [event.id, parseHtml])

  // Show manual paste immediately — event source pages are Turnstile-protected
  // so auto-fetch is attempted as a bonus, not the primary path
  useEffect(() => {
    setShowManual(true)
    if (event.source_1001_id) {
      autoFetch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleManualParse = () => {
    if (!manualHtml.trim()) return
    parseHtml(manualHtml)
  }

  const toggleSelect = (idx: number) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e))
  }

  const toggleAll = () => {
    const allSelected = entries.every((e) => e.selected)
    setEntries((prev) => prev.map((e) => ({ ...e, selected: !allSelected })))
  }

  const selectedCount = entries.filter((e) => e.selected).length

  // Resolve or create artist by name
  const resolveArtist = async (name: string): Promise<string | null> => {
    try {
      const res = await fetchArtists(name)
      const exact = res.data.find((a: { name: string }) => a.name.toLowerCase() === name.toLowerCase())
      if (exact) return exact.id

      // Create new artist
      const createRes = await createArtistAdmin({ name })
      return createRes.data?.id || null
    } catch {
      return null
    }
  }

  const handleImport = async () => {
    const toImport = entries.filter((e) => e.selected && e.importState !== 'done')
    if (toImport.length === 0) return

    setStatus('importing')
    setImportProgress({ current: 0, total: toImport.length })
    abortRef.current = false

    for (let i = 0; i < toImport.length; i++) {
      if (abortRef.current) break

      const entry = toImport[i]
      const entryIdx = entries.findIndex((e) => e.tracklist_id === entry.tracklist_id)
      setImportProgress({ current: i + 1, total: toImport.length })

      try {
        // Step 1: Create the set
        updateEntryState(entryIdx, 'creating')

        const artistId = await resolveArtist(entry.artist)
        const tlUrl = `https://www.1001tracklists.com${entry.tracklist_url}`

        const setRes = await adminCreateSet({
          title: entry.title,
          artist: entry.artist,
          genre: entry.genre,
          duration_seconds: (entry.duration_minutes || 60) * 60,
          recorded_date: entry.date,
          tracklist_1001_url: tlUrl,
          event_id: event.id,
          ...(artistId ? { artist_id: artistId } : {}),
        })

        const setId = setRes.data.id

        // Step 2: Link to event
        updateEntryState(entryIdx, 'linking')
        await linkSetToEvent(event.id, setId)

        // Step 3: Try to fetch tracklist from 1001TL
        updateEntryState(entryIdx, 'fetching_tl')
        try {
          const tlRes = await fetch1001Tracklists(setId)
          if (tlRes.data?.tracks?.length > 0) {
            // Step 4: Import tracks
            updateEntryState(entryIdx, 'importing_tl')
            await import1001Tracklists(setId, tlRes.data.tracks)
          }
        } catch {
          // Tracklist fetch failed — set is still created, just no tracks
          console.warn(`[ImportSets] Tracklist fetch failed for ${entry.tracklist_id}`)
        }

        updateEntryState(entryIdx, 'done')
      } catch (err) {
        updateEntryState(entryIdx, 'error', err instanceof Error ? err.message : 'Import failed')
      }
    }

    setStatus('parsed')
    setImportProgress(null)
  }

  const updateEntryState = (idx: number, state: SetImportState, error?: string) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, importState: state, importError: error } : e))
  }

  const doneCount = entries.filter((e) => e.importState === 'done').length
  const errorCount = entries.filter((e) => e.importState === 'error').length
  const remainingSelected = entries.filter((e) => e.selected && e.importState !== 'done').length

  return (
    <Modal isOpen onClose={onClose} title={`Import Sets — ${event.name}`} className="!max-w-3xl">
      <div className="space-y-3">
        {/* Fetch status / error */}
        {status === 'fetching' && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'oklch(var(--h3) / 0.3)', borderTopColor: 'oklch(var(--h3))' }} />
            <span className="text-sm" style={{ color: 'oklch(var(--c2))' }}>Fetching event page from 1001Tracklists...</span>
          </div>
        )}

        {fetchError && (
          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'hsl(0 60% 50% / 0.1)', color: 'hsl(0, 60%, 65%)' }}>
            {fetchError}
          </div>
        )}

        {/* Manual paste */}
        {showManual && status !== 'fetching' && status !== 'importing' && status !== 'parsed' && (
          <div className="space-y-2">
            <div className="px-3 py-2.5 rounded-lg space-y-1.5" style={{ background: 'oklch(var(--b4) / 0.2)' }}>
              <p className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'oklch(var(--c1))' }}>
                How to get the full page source:
              </p>
              <ol className="text-[11px] space-y-1 list-decimal list-inside" style={{ color: 'oklch(var(--c2))' }}>
                <li>
                  Go to{' '}
                  <code className="font-mono text-[10px] px-1 py-0.5 rounded" style={{ color: 'oklch(var(--h3))', background: 'oklch(var(--h3) / 0.08)' }}>
                    1001tracklists.com/source/{event.source_1001_id || '...'}/
                  </code>
                </li>
                <li>Scroll down until all sets are loaded (click "Show More" if needed)</li>
                <li>
                  Open browser console (<kbd className="font-mono text-[10px] px-1 py-0.5 rounded" style={{ background: 'oklch(var(--b3) / 0.5)' }}>F12</kbd> {'>'} Console) and run:{' '}
                  <code className="font-mono text-[10px] px-1 py-0.5 rounded select-all" style={{ color: 'oklch(var(--h3))', background: 'oklch(var(--h3) / 0.08)' }}>
                    copy(document.documentElement.outerHTML)
                  </code>
                </li>
                <li>Paste below (the full page with all sets will be in your clipboard)</li>
              </ol>
              <p className="text-[10px]" style={{ color: 'oklch(var(--c3))' }}>
                Note: "View Page Source" (Ctrl+U) only gets the first ~14 sets. The console method above gets all of them.
              </p>
            </div>
            <textarea
              value={manualHtml}
              onChange={(e) => setManualHtml(e.target.value)}
              rows={4}
              placeholder="Paste event source page HTML..."
              className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-none focus:outline-none"
              style={{ background: 'oklch(var(--b4) / 0.4)', color: 'oklch(var(--c1))' }}
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleManualParse} disabled={!manualHtml.trim()}>
                Parse HTML
              </Button>
              {event.source_1001_id && (
                <Button variant="ghost" size="sm" onClick={autoFetch}>
                  Retry auto-fetch
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Parsed entries table */}
        {status !== 'idle' && status !== 'fetching' && entries.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'oklch(var(--c1))' }}>
                  {entries.length} sets found
                </span>
                {doneCount > 0 && (
                  <Badge variant="accent">{doneCount} imported</Badge>
                )}
                {errorCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}>
                    {errorCount} failed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {status !== 'importing' && (
                  <>
                    <button
                      onClick={() => { setEntries([]); setStatus('idle'); setShowManual(true); setManualHtml('') }}
                      className="text-xs border-none cursor-pointer px-2 py-1 rounded-md transition-colors"
                      style={{ color: 'oklch(var(--c3))', background: 'oklch(var(--b4) / 0.2)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'oklch(var(--b4) / 0.35)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'oklch(var(--b4) / 0.2)' }}
                    >
                      Re-paste
                    </button>
                    <button
                      onClick={toggleAll}
                      className="text-xs border-none cursor-pointer px-2 py-1 rounded-md transition-colors"
                      style={{ color: 'oklch(var(--h3))', background: 'oklch(var(--h3) / 0.08)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'oklch(var(--h3) / 0.15)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'oklch(var(--h3) / 0.08)' }}
                    >
                      {entries.every((e) => e.selected) ? 'Deselect all' : 'Select all'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
              {entries.map((entry, idx) => (
                <div
                  key={entry.tracklist_id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors"
                  style={{
                    background: entry.importState === 'done' ? 'hsl(120 40% 40% / 0.08)'
                      : entry.importState === 'error' ? 'hsl(0 60% 50% / 0.06)'
                      : entry.selected ? 'oklch(var(--b4) / 0.15)' : 'transparent',
                    opacity: entry.importState === 'done' ? 0.6 : 1,
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(idx)}
                    disabled={entry.importState === 'done' || status === 'importing'}
                    className="w-4 h-4 rounded shrink-0 flex items-center justify-center border-none cursor-pointer transition-colors"
                    style={{
                      background: entry.selected ? 'oklch(var(--h3))' : 'oklch(var(--b4) / 0.4)',
                      boxShadow: entry.selected ? 'none' : 'inset 0 0 0 1px oklch(var(--b3) / 0.4)',
                    }}
                  >
                    {entry.selected && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-[var(--font-weight-medium)] truncate" style={{ color: 'oklch(var(--c1))' }}>
                      {entry.artist}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {entry.stage && (
                        <span className="text-[10px] truncate" style={{ color: 'oklch(var(--c3))' }}>@ {entry.stage}</span>
                      )}
                      {entry.date && (
                        <span className="text-[10px] font-mono" style={{ color: 'oklch(var(--c3) / 0.6)' }}>{entry.date}</span>
                      )}
                      {entry.genre && (
                        <span className="text-[9px] font-mono px-1 py-0 rounded" style={{ color: 'oklch(var(--h3) / 0.7)', background: 'oklch(var(--h3) / 0.08)' }}>
                          {entry.genre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.duration_minutes && (
                      <span className="text-[10px] font-mono" style={{ color: 'oklch(var(--c3))' }}>
                        {entry.duration_minutes >= 60 ? `${Math.floor(entry.duration_minutes / 60)}h${entry.duration_minutes % 60 > 0 ? `${entry.duration_minutes % 60}m` : ''}` : `${entry.duration_minutes}m`}
                      </span>
                    )}
                    {entry.tracks_total && (
                      <span className="text-[10px] font-mono" style={{ color: 'oklch(var(--c3))' }}>
                        {entry.tracks_identified !== undefined ? `${entry.tracks_identified}/${entry.tracks_total}` : entry.tracks_total} tracks
                      </span>
                    )}
                    {entry.has_video && (
                      <svg className="w-3 h-3" style={{ color: 'oklch(var(--c3) / 0.5)' }} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    )}
                  </div>

                  {/* Import state indicator */}
                  <div className="w-16 text-right shrink-0">
                    {entry.importState === 'creating' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'oklch(var(--h3))' }}>Creating...</span>
                    )}
                    {entry.importState === 'linking' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'oklch(var(--h3))' }}>Linking...</span>
                    )}
                    {entry.importState === 'fetching_tl' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'oklch(var(--h3))' }}>Tracks...</span>
                    )}
                    {entry.importState === 'importing_tl' && (
                      <span className="text-[10px] animate-pulse" style={{ color: 'oklch(var(--h3))' }}>Saving...</span>
                    )}
                    {entry.importState === 'done' && (
                      <span className="text-[10px]" style={{ color: 'hsl(120 50% 55%)' }}>Done</span>
                    )}
                    {entry.importState === 'error' && (
                      <span className="text-[10px]" style={{ color: 'hsl(0 60% 65%)' }} title={entry.importError}>
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Import progress bar */}
        {status === 'importing' && importProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'oklch(var(--c2))' }}>Importing set {importProgress.current} of {importProgress.total}...</span>
              <span style={{ color: 'oklch(var(--c3))' }}>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(var(--b4) / 0.3)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  background: 'oklch(var(--h3))',
                }}
              />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={status === 'importing' ? () => { abortRef.current = true } : onClose} className="flex-1">
            {status === 'importing' ? 'Stop' : 'Cancel'}
          </Button>
          {(status === 'parsed' || (status === 'importing' && importProgress)) && (
            <Button
              variant="primary"
              onClick={doneCount > 0 && remainingSelected === 0 ? onImported : handleImport}
              disabled={status === 'importing' || (doneCount === 0 && selectedCount === 0)}
              className="flex-1"
            >
              {doneCount > 0 && remainingSelected === 0
                ? 'Done'
                : doneCount > 0
                ? `Import ${remainingSelected} remaining`
                : `Import ${selectedCount} set${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
