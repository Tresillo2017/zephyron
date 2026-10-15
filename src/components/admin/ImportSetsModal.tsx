import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchEvent1001Sets, fetchArtists, createArtistAdmin, adminCreateSet, linkSetToEvent, fetch1001Tracklists, import1001Tracklists } from '../../lib/api'
import { parse1001EventSetsHtml, type EventSetEntry } from '../../lib/parse-1001tracklists-source'
import { InlineAlert, Spinner } from '../bleh'
import { AdminButton, AdminModal } from './adminUi'
import { ImportEntriesTable, ImportProgressBar, ManualPastePanel } from './ImportSetsPanels'
import type { Event } from './eventTypes'

// ═══════════════════════════════════════════
// Import Sets from 1001Tracklists modal
// ═══════════════════════════════════════════

export type ImportStatus = 'idle' | 'fetching' | 'parsed' | 'importing'
export type SetImportState = 'pending' | 'creating' | 'linking' | 'fetching_tl' | 'importing_tl' | 'done' | 'error'

export interface ImportableSet extends EventSetEntry {
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

  const primaryLabel = doneCount > 0 && remainingSelected === 0
    ? 'Done'
    : doneCount > 0
    ? `Import ${remainingSelected} remaining`
    : `Import ${selectedCount} set${selectedCount !== 1 ? 's' : ''}`

  const footer = (
    <>
      <AdminButton variant="ghost" onClick={status === 'importing' ? () => { abortRef.current = true } : onClose}>
        {status === 'importing' ? 'Stop' : 'Cancel'}
      </AdminButton>
      {(status === 'parsed' || (status === 'importing' && importProgress)) && (
        <AdminButton
          variant="primary"
          onClick={doneCount > 0 && remainingSelected === 0 ? onImported : handleImport}
          disabled={status === 'importing' || (doneCount === 0 && selectedCount === 0)}
        >
          {primaryLabel}
        </AdminButton>
      )}
    </>
  )

  return (
    <AdminModal isOpen onClose={onClose} title={`Import Sets — ${event.name}`} size="lg" footer={footer}>
      <div className="flex flex-col gap-3">
        {status === 'fetching' && (
          <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-text">
            <Spinner size={16} />
            <span>Fetching event page from 1001Tracklists...</span>
          </div>
        )}

        {fetchError && <InlineAlert tone="error">{fetchError}</InlineAlert>}

        {showManual && status !== 'fetching' && status !== 'importing' && status !== 'parsed' && (
          <ManualPastePanel
            sourceId={event.source_1001_id ?? null}
            manualHtml={manualHtml}
            onManualHtmlChange={setManualHtml}
            onParse={handleManualParse}
            onRetry={autoFetch}
          />
        )}

        {status !== 'idle' && status !== 'fetching' && entries.length > 0 && (
          <ImportEntriesTable
            entries={entries}
            status={status}
            doneCount={doneCount}
            errorCount={errorCount}
            allSelected={entries.every((e) => e.selected)}
            onRepaste={() => { setEntries([]); setStatus('idle'); setShowManual(true); setManualHtml('') }}
            onToggleAll={toggleAll}
            onToggle={toggleSelect}
          />
        )}

        {status === 'importing' && importProgress && <ImportProgressBar progress={importProgress} />}
      </div>
    </AdminModal>
  )
}
