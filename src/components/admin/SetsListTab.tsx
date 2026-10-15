import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router'
import {
  fetchSets,
  batchSetsAdmin,
  fetchArtists,
  fetchEvents,
  fetchAdminSourceRequests,
  approveAdminSourceRequest,
  rejectAdminSourceRequest,
  fetchAdminSetRequests,
  approveAdminSetRequest,
  rejectAdminSetRequest,
  type SourceRequest,
  type SetRequest,
} from '../../lib/api'
import { AutocompleteInput } from '../ui/AutocompleteInput'
import { Input, Modal, Pagination, Select, Skeleton } from '../bleh'
import { GENRES } from '../../lib/constants'
import type { DjSet } from '../../lib/types'
import { AdminButton, AdminModal } from './adminUi'
import { EditSetModal } from './EditSetModal'
import { SetsUploadTab } from './SetsUploadTab'
import { SetsTable } from './SetsTable'
import { RequestsPanel } from './RequestsPanel'
import { SetsFilters, DETECTION_OPTIONS } from './SetsFilters'

// ═══════════════════════════════════════════
// SETS LIST TAB
// ═══════════════════════════════════════════

const PAGE_SIZE = 50

const GENRE_OPTIONS_BATCH = [{ value: '', label: 'Genre...' }, ...GENRES.map((g) => ({ value: g, label: g }))]

export function SetsListTab({ editId }: { editId?: string }) {
  const [, setSearchParams] = useSearchParams()
  const [setsView, setSetsView] = useState<'all' | 'requests'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  // Data
  const [sets, setSets] = useState<DjSet[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [editingSet, setEditingSet] = useState<DjSet | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  // Track dismissed editId to prevent re-opening
  const dismissedEditIdRef = useRef<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [streamType, setStreamType] = useState('')
  const [detectionStatus, setDetectionStatus] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [hasSource, setHasSource] = useState('')

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchAction, setBatchAction] = useState<'delete' | 'detect' | 'redetect' | 'update' | ''>('')
  const [batchGenre, setBatchGenre] = useState('')
  const [batchDetectionStatus, setBatchDetectionStatus] = useState('')
  const [batchArtist, setBatchArtist] = useState('')
  const [batchArtistId, setBatchArtistId] = useState<string | null>(null)
  const [batchEvent, setBatchEvent] = useState('')
  const [batchEventId, setBatchEventId] = useState<string | null>(null)
  const [batchVenue, setBatchVenue] = useState('')
  const [isBatching, setIsBatching] = useState(false)
  const [batchMsg, setBatchMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Debounced search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search
    }, 350)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search])

  // Filters bar active count for collapsed summary
  const activeFilterCount = [genre, streamType, detectionStatus, hasSource].filter(Boolean).length

  const loadSets = useCallback(() => {
    setIsLoading(true)
    fetchSets({
      page,
      pageSize: PAGE_SIZE,
      sort,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(genre && { genre }),
      ...(streamType && { stream_type: streamType }),
      ...(detectionStatus && { detection_status: detectionStatus }),
      ...(hasSource && { has_source: hasSource }),
    })
      .then((res) => {
        setSets(res.data)
        setTotal(res.total)
        setTotalPages(res.totalPages)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [page, sort, debouncedSearch, genre, streamType, detectionStatus, hasSource])

   
  useEffect(() => { loadSets() }, [loadSets])

  // Auto-open edit modal when editId is provided via URL
  useEffect(() => {
    if (editId && sets.length > 0 && !editingSet && dismissedEditIdRef.current !== editId) {
      const match = sets.find((s) => s.id === editId)
      if (match) setEditingSet(match)
    }
  }, [editId, sets, editingSet])

  // Close edit modal — clear both state and URL param so it doesn't re-open
  const closeEditModal = useCallback(() => {
    if (editId) dismissedEditIdRef.current = editId
    setEditingSet(null)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('edit')
      return next
    }, { replace: true })
  }, [editId, setSearchParams])

  // Clear batch selection on data change
  useEffect(() => { setSelectedIds(new Set()) }, [sets])

  const handleSetCreated = () => {
    setShowAddModal(false)
    loadSets()
  }

  // Reset to page 1 when any filter changes
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  // Batch operations
  const allSelected = sets.length > 0 && sets.every((s) => selectedIds.has(s.id))
  const someSelected = selectedIds.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sets.map((s) => s.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)

  const handleBatch = async () => {
    if (!batchAction || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const action = batchAction

    // Delete is confirmed in a modal first; confirmBatchDelete runs the same batch.
    if (batchAction === 'delete') {
      setPendingDeleteIds(ids)
      return
    }
    await runBatch(ids, action)
  }

  const confirmBatchDelete = async () => {
    const ids = pendingDeleteIds
    setPendingDeleteIds(null)
    if (ids) await runBatch(ids, "delete")
  }

  const runBatch = async (ids: string[], action: Exclude<typeof batchAction, "">) => {
    setIsBatching(true)
    setBatchMsg(null)
    try {
      const updates: Record<string, unknown> = {}
      if (action === "update") {
        if (batchGenre) updates.genre = batchGenre
        if (batchDetectionStatus) updates.detection_status = batchDetectionStatus
        if (batchArtist) {
          updates.artist = batchArtist
          if (batchArtistId) updates.artist_id = batchArtistId
        }
        if (batchEvent) {
          updates.event = batchEvent
          if (batchEventId) updates.event_id = batchEventId
        }
        if (batchVenue) updates.venue = batchVenue
        if (Object.keys(updates).length === 0) {
          setBatchMsg({ type: 'error', text: 'Select at least one field to update.' })
          setIsBatching(false)
          return
        }
      }

      const res = await batchSetsAdmin({
        ids,
        action,
        ...(action === "update" && { updates }),
      })

      const d = res.data
      const msg = action === "delete"
        ? `Deleted ${d.deleted || 0} sets`
        : action === "update"
        ? `Updated ${d.updated || 0} sets`
        : `Queued ${d.queued || 0} sets for detection`

      setBatchMsg({ type: 'success', text: msg })
      setSelectedIds(new Set())
      setBatchAction('')
      setBatchGenre('')
      setBatchDetectionStatus('')
      setBatchArtist('')
      setBatchArtistId(null)
      setBatchEvent('')
      setBatchEventId(null)
      setBatchVenue('')
      loadSets()
    } catch (err) {
      setBatchMsg({ type: 'error', text: err instanceof Error ? err.message : 'Batch operation failed' })
    } finally {
      setIsBatching(false)
    }
  }

  // Requests state
  const [requestsTab, setRequestsTab] = useState<'source' | 'sets'>('source')
  const [sourceRequests, setSourceRequests] = useState<SourceRequest[]>([])
  const [setRequests, setSetRequests] = useState<SetRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestActionMsg, setRequestActionMsg] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const [srcRes, setRes] = await Promise.all([
        fetchAdminSourceRequests('pending'),
        fetchAdminSetRequests('pending'),
      ])
      setSourceRequests(srcRes.data || [])
      setSetRequests(setRes.data || [])
    } catch {}
    setRequestsLoading(false)
  }, [])

  useEffect(() => {
    if (setsView === 'requests') {
      loadRequests()
    }
  }, [setsView, loadRequests])

  const handleSourceApprove = async (id: string) => {
    try {
      await approveAdminSourceRequest(id)
      setRequestActionMsg('Source applied to set.')
      loadRequests()
    } catch (e: any) {
      setRequestActionMsg(e?.message || 'Failed')
    }
  }

  const handleSourceReject = async (id: string) => {
    try {
      await rejectAdminSourceRequest(id)
      setRequestActionMsg('Request rejected.')
      loadRequests()
    } catch (e: any) {
      setRequestActionMsg(e?.message || 'Failed')
    }
  }

  const handleSetApprove = async (id: string) => {
    try {
      await approveAdminSetRequest(id)
      setRequestActionMsg('Set request marked as approved.')
      loadRequests()
    } catch (e: any) {
      setRequestActionMsg(e?.message || 'Failed')
    }
  }

  const handleSetReject = async (id: string) => {
    try {
      await rejectAdminSetRequest(id)
      setRequestActionMsg('Set request rejected.')
      loadRequests()
    } catch (e: any) {
      setRequestActionMsg(e?.message || 'Failed')
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Sets view" className="flex items-center gap-1">
          <AdminButton variant={setsView === 'all' ? 'primary' : 'ghost'} size="sm" aria-pressed={setsView === 'all'} onClick={() => setSetsView('all')}>
            All Sets ({total})
          </AdminButton>
          <AdminButton variant={setsView === 'requests' ? 'primary' : 'ghost'} size="sm" aria-pressed={setsView === 'requests'} onClick={() => setSetsView('requests')}>
            Requested Sets
          </AdminButton>
        </div>
        {setsView === 'all' && (
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Layout" className="flex items-center gap-1">
              <AdminButton variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}>
                List
              </AdminButton>
              <AdminButton variant={viewMode === 'grid' ? 'primary' : 'ghost'} size="sm" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
                Grid
              </AdminButton>
            </div>
            <AdminButton variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              Add Set
            </AdminButton>
          </div>
        )}
      </div>

      {setsView === 'requests' && (
        <RequestsPanel
          requestsTab={requestsTab}
          onRequestsTabChange={setRequestsTab}
          sourceRequests={sourceRequests}
          setRequests={setRequests}
          loading={requestsLoading}
          actionMsg={requestActionMsg}
          onDismissMsg={() => setRequestActionMsg(null)}
          onRefresh={loadRequests}
          onSourceApprove={handleSourceApprove}
          onSourceReject={handleSourceReject}
          onSetApprove={handleSetApprove}
          onSetReject={handleSetReject}
        />
      )}

      {setsView === 'all' && (
        <>
          <SetsFilters
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={(v) => { setSort(v); setPage(1) }}
            genre={genre}
            onGenreChange={handleFilterChange(setGenre)}
            streamType={streamType}
            onStreamTypeChange={handleFilterChange(setStreamType)}
            detectionStatus={detectionStatus}
            onDetectionStatusChange={handleFilterChange(setDetectionStatus)}
            hasSource={hasSource}
            onHasSourceChange={handleFilterChange(setHasSource)}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => { setGenre(''); setStreamType(''); setDetectionStatus(''); setHasSource(''); setPage(1) }}
          />

          {someSelected && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card bg-accent/5 p-3 shadow-inset">
              <span className="text-[12px] font-medium text-accent-2">{selectedIds.size} selected</span>
              <span className="mx-1 h-4 w-px bg-b4/40" aria-hidden="true" />
              <Select
                label="Batch action"
                value={batchAction}
                onChange={(v) => setBatchAction(v as typeof batchAction)}
                options={[
                  { value: '', label: 'Choose action...' },
                  { value: 'detect', label: 'Run Detection' },
                  { value: 'redetect', label: 'Re-detect' },
                  { value: 'update', label: 'Batch Update' },
                  { value: 'delete', label: 'Delete' },
                ]}
              />

              {batchAction === 'update' && (
                <>
                  <Select
                    label="Batch genre"
                    value={batchGenre}
                    onChange={setBatchGenre}
                    options={GENRE_OPTIONS_BATCH}
                  />
                  <Select
                    label="Batch detection status"
                    value={batchDetectionStatus}
                    onChange={setBatchDetectionStatus}
                    options={[{ value: '', label: 'Detection status...' }, ...DETECTION_OPTIONS.filter((o) => o.value)]}
                  />
                  <AutocompleteInput
                    value={batchArtist}
                    onChange={setBatchArtist}
                    onSelect={(opt) => setBatchArtistId(opt.id)}
                    onClear={() => setBatchArtistId(null)}
                    selectedId={batchArtistId}
                    fetchOptions={async (q) => {
                      const res = await fetchArtists(q)
                      return (res.data || []).map((a: Record<string, unknown>) => ({
                        id: a.id as string,
                        label: a.name as string,
                        sublabel: a.set_count ? `${a.set_count} sets` : undefined,
                      }))
                    }}
                    placeholder="Artist..."
                    className="!text-xs !py-1.5"
                  />
                  <AutocompleteInput
                    value={batchEvent}
                    onChange={setBatchEvent}
                    onSelect={(opt) => setBatchEventId(opt.id)}
                    onClear={() => setBatchEventId(null)}
                    selectedId={batchEventId}
                    fetchOptions={async (q) => {
                      const res = await fetchEvents(q)
                      return (res.data || []).map((e: Record<string, unknown>) => ({
                        id: e.id as string,
                        label: e.name as string,
                        sublabel: (e.series as string) || undefined,
                      }))
                    }}
                    placeholder="Event/Festival..."
                    className="!text-xs !py-1.5"
                  />
                  <Input
                    aria-label="Venue (stage/room)"
                    value={batchVenue}
                    onChange={(e) => setBatchVenue(e.target.value)}
                    placeholder="Venue (stage/room)..."
                    className="!h-8 !py-1 !text-xs"
                  />
                </>
              )}

              <AdminButton variant={batchAction === 'delete' ? 'danger' : 'primary'} size="sm" onClick={handleBatch} disabled={!batchAction || isBatching}>
                {isBatching ? 'Working...' : 'Apply'}
              </AdminButton>
              <AdminButton variant="ghost" size="sm" onClick={() => { setSelectedIds(new Set()); setBatchAction(''); setBatchMsg(null) }}>
                Cancel
              </AdminButton>

              {batchMsg && (
                <p role="status" className={batchMsg.type === 'error' ? 'w-full text-[12px] text-error' : 'w-full text-[12px] text-accent-2'}>
                  {batchMsg.text}
                </p>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} height={40} borderRadius={10} />
              ))}
            </div>
          ) : sets.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-muted">
              {debouncedSearch || activeFilterCount > 0 ? 'No sets match your filters.' : 'No sets in the catalog yet. Click "Add Set" to upload your first DJ set.'}
            </p>
          ) : (
            <>
              <SetsTable
                sets={sets}
                viewMode={viewMode}
                selectedIds={selectedIds}
                allSelected={allSelected}
                onToggleAll={toggleAll}
                onToggleOne={toggleOne}
                onEdit={setEditingSet}
              />
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAddModal && (
        <Modal title="Add DJ Set" onClose={() => setShowAddModal(false)} width={896}>
          <SetsUploadTab onClose={() => setShowAddModal(false)} onSetCreated={() => { setShowAddModal(false); handleSetCreated() }} />
        </Modal>
      )}

      <AdminModal
        isOpen={pendingDeleteIds !== null}
        onClose={() => setPendingDeleteIds(null)}
        title="Delete sets"
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setPendingDeleteIds(null)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={confirmBatchDelete}>Delete</AdminButton>
          </>
        }
      >
        <p className="text-[13px] text-text">
          {`Delete ${pendingDeleteIds?.length ?? 0} set${(pendingDeleteIds?.length ?? 0) > 1 ? 's' : ''}? This cannot be undone.`}
        </p>
      </AdminModal>

      {editingSet && (
        <EditSetModal
          set={editingSet}
          onClose={closeEditModal}
          onSaved={() => { closeEditModal(); loadSets() }}
          onDeleted={(id) => { setSets((prev) => prev.filter((s) => s.id !== id)); closeEditModal() }}
        />
      )}
    </>
  )
}
