import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
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
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { Modal } from '../ui/Modal'
import { AutocompleteInput } from '../ui/AutocompleteInput'
import { formatDuration } from '../../lib/formatTime'
import { GENRES } from '../../lib/constants'
import type { DjSet } from '../../lib/types'
import { EditSetModal } from './EditSetModal'
import { SetsUploadTab } from './SetsUploadTab'

// ═══════════════════════════════════════════
// SETS LIST TAB
// ═══════════════════════════════════════════

const STREAM_TYPE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'invidious', label: 'YouTube' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'hearthis', label: 'HearThis' },
  { value: 'r2', label: 'R2 Upload' },
  { value: 'none', label: 'No Source' },
] as const

const DETECTION_OPTIONS = [
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

const PAGE_SIZE = 50

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

  const handleBatch = async () => {
    if (!batchAction || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)

    if (batchAction === 'delete') {
      if (!confirm(`Delete ${ids.length} set${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    }

    setIsBatching(true)
    setBatchMsg(null)
    try {
      const updates: Record<string, unknown> = {}
      if (batchAction === 'update') {
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
        action: batchAction,
        ...(batchAction === 'update' && { updates }),
      })

      const d = res.data
      const msg = batchAction === 'delete'
        ? `Deleted ${d.deleted || 0} sets`
        : batchAction === 'update'
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

  const selectCls = 'px-2.5 py-1.5 rounded-lg text-xs focus:outline-none appearance-none cursor-pointer'
  const selectStyle = { background: 'oklch(var(--b4) / 0.4)', color: 'oklch(var(--c2))' }

  // Helper to check if a set's metadata is complete
  const isSetMetadataComplete = (set: DjSet) => {
    // A set is considered "complete" if it has:
    // - Title and artist (always required)
    // - Event linked (event_id is present when set is linked to an event)
    // - Genre specified
    // - Stream source available
    // - Detection completed
    const hasBasics = !!(set.title && set.artist)
    const hasEvent = !!set.event_id // Only complete if actually linked to an event entity
    const hasGenre = !!set.genre
    const hasSource = !!((set as any).stream_type && (set as any).stream_type !== 'none')
    const hasDetection = set.detection_status === 'complete'

    return hasBasics && hasEvent && hasGenre && hasSource && hasDetection
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
      {/* Header row with tabs */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSetsView('all')}
            className="px-3 py-1.5 rounded-lg text-sm font-[var(--font-weight-medium)] transition-colors"
            style={{
              background: setsView === 'all' ? 'oklch(var(--h3) / 0.12)' : 'transparent',
              color: setsView === 'all' ? 'oklch(var(--h3))' : 'oklch(var(--c2))',
            }}
          >
            All Sets
            <span className="ml-1.5 text-xs opacity-70">({total})</span>
          </button>
          <button
            onClick={() => setSetsView('requests')}
            className="px-3 py-1.5 rounded-lg text-sm font-[var(--font-weight-medium)] transition-colors"
            style={{
              background: setsView === 'requests' ? 'oklch(var(--h3) / 0.12)' : 'transparent',
              color: setsView === 'requests' ? 'oklch(var(--h3))' : 'oklch(var(--c2))',
            }}
          >
            Requested Sets
          </button>
        </div>
        {setsView === 'all' && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid oklch(var(--b4) / 0.4)' }}>
              <button
                onClick={() => setViewMode('list')}
                className="px-2 py-1 transition-colors"
                style={{
                  background: viewMode === 'list' ? 'oklch(var(--b4) / 0.5)' : 'transparent',
                  color: viewMode === 'list' ? 'oklch(var(--c1))' : 'oklch(var(--c3))',
                }}
                title="List view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className="px-2 py-1 transition-colors"
                style={{
                  background: viewMode === 'grid' ? 'oklch(var(--b4) / 0.5)' : 'transparent',
                  color: viewMode === 'grid' ? 'oklch(var(--c1))' : 'oklch(var(--c3))',
                }}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              Add Set
            </Button>
          </div>
        )}
      </div>

      {/* Requests view */}
      {setsView === 'requests' && (
        <div className="rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px oklch(var(--b4) / 0.25)' }}>
          <div className="flex items-center gap-0" style={{ background: 'oklch(var(--b5) / 0.6)', borderBottom: '1px solid oklch(var(--b4) / 0.2)' }}>
            <button
              onClick={() => setRequestsTab('source')}
              className="px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{
                color: requestsTab === 'source' ? 'oklch(var(--h3))' : 'oklch(var(--c3))',
                borderBottom: requestsTab === 'source' ? '2px solid oklch(var(--h3))' : '2px solid transparent',
              }}
            >
              Source Requests
              {sourceRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono" style={{ background: 'oklch(var(--h3) / 0.2)', color: 'oklch(var(--h3))' }}>
                  {sourceRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRequestsTab('sets')}
              className="px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{
                color: requestsTab === 'sets' ? 'oklch(var(--h3))' : 'oklch(var(--c3))',
                borderBottom: requestsTab === 'sets' ? '2px solid oklch(var(--h3))' : '2px solid transparent',
              }}
            >
              Set Requests
              {setRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono" style={{ background: 'oklch(var(--h3) / 0.2)', color: 'oklch(var(--h3))' }}>
                  {setRequests.length}
                </span>
              )}
            </button>
            <button onClick={loadRequests} className="ml-auto mr-3 p-1.5 rounded-md transition-colors" style={{ color: 'oklch(var(--c3))' }} title="Refresh">
              <svg className={`w-3.5 h-3.5 ${requestsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {requestActionMsg && (
            <div className="px-4 py-2 text-xs" style={{ background: 'oklch(var(--h3) / 0.1)', color: 'oklch(var(--h3))' }}>
              {requestActionMsg}
              <button onClick={() => setRequestActionMsg(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          <div className="max-h-[600px] overflow-y-auto">
            {requestsTab === 'source' && (
              <>
                {sourceRequests.length === 0 ? (
                  <p className="text-center py-12 text-sm" style={{ color: 'oklch(var(--c3))' }}>No pending source requests</p>
                ) : (
                  sourceRequests.map((req) => (
                    <div key={req.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid oklch(var(--b4) / 0.1)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'oklch(var(--c1))' }}>
                          {req.set_title} — {req.set_artist}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(var(--c3))' }}>
                          <span className="uppercase font-mono mr-1">{req.source_type}</span>
                          <a href={req.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            {req.source_url.length > 60 ? req.source_url.slice(0, 60) + '…' : req.source_url}
                          </a>
                        </p>
                        {req.user_name && (
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(var(--c3))' }}>by {req.user_name}</p>
                        )}
                        {req.notes && (
                          <p className="text-xs italic mt-1" style={{ color: 'oklch(var(--c3))' }}>{req.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" onClick={() => handleSourceApprove(req.id)}>
                          Apply
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleSourceReject(req.id)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {requestsTab === 'sets' && (
              <>
                {setRequests.length === 0 ? (
                  <p className="text-center py-12 text-sm" style={{ color: 'oklch(var(--c3))' }}>No pending set requests</p>
                ) : (
                  setRequests.map((req) => (
                    <div key={req.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '1px solid oklch(var(--b4) / 0.1)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'oklch(var(--c1))' }}>
                          {req.artist} — {req.title}
                        </p>
                        {req.source_url && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(var(--c3))' }}>
                            <span className="uppercase font-mono mr-1">{req.source_type}</span>
                            <a href={req.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              {req.source_url}
                            </a>
                          </p>
                        )}
                        <div className="flex gap-2 mt-0.5">
                          {req.event && <Badge variant="muted">{req.event}</Badge>}
                          {req.genre && <Badge variant="muted">{req.genre}</Badge>}
                          {req.user_name && <span className="text-xs" style={{ color: 'oklch(var(--c3))' }}>by {req.user_name}</span>}
                        </div>
                        {req.notes && (
                          <p className="text-xs italic mt-1" style={{ color: 'oklch(var(--c3))' }}>{req.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" onClick={() => handleSetApprove(req.id)}>
                          Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleSetReject(req.id)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* All Sets view */}
      {setsView === 'all' && (
        <>
          {/* Search + Filters bar */}
          <div className="rounded-xl p-3 mb-4" style={{ background: 'oklch(var(--b5) / 0.4)', boxShadow: 'inset 0 0 0 1px oklch(var(--b4) / 0.2)' }}>
        {/* Search row */}
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'oklch(var(--c3))' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, artist, event, venue..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200"
              style={{ background: 'oklch(var(--b4) / 0.5)', color: 'oklch(var(--c1))' }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px oklch(var(--h3) / 0.4)' }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }} className={selectCls} style={selectStyle}>
            {SORT_OPTIONS_ADMIN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter pills row */}
        <div className="flex flex-wrap gap-2">
          <select value={genre} onChange={(e) => handleFilterChange(setGenre)(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">All Genres</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={streamType} onChange={(e) => handleFilterChange(setStreamType)(e.target.value)} className={selectCls} style={selectStyle}>
            {STREAM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={detectionStatus} onChange={(e) => handleFilterChange(setDetectionStatus)(e.target.value)} className={selectCls} style={selectStyle}>
            {DETECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={hasSource} onChange={(e) => handleFilterChange(setHasSource)(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">Any Source</option>
            <option value="true">Has Source</option>
            <option value="false">No Source</option>
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setGenre(''); setStreamType(''); setDetectionStatus(''); setHasSource(''); setPage(1) }}
              className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
              style={{ color: 'oklch(var(--c3))' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'oklch(var(--c1))' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'oklch(var(--c3))' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Batch operations bar — only when items selected */}
      {someSelected && (
        <div
          className="rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3"
          style={{ background: 'oklch(var(--h3) / 0.06)', boxShadow: 'inset 0 0 0 1px oklch(var(--h3) / 0.15)' }}
        >
          <span className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'oklch(var(--h3))' }}>
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px" style={{ background: 'oklch(var(--h3) / 0.2)' }} />

          <select
            value={batchAction}
            onChange={(e) => setBatchAction(e.target.value as typeof batchAction)}
            className={selectCls}
            style={{ background: 'oklch(var(--h3) / 0.1)', color: 'oklch(var(--h3))' }}
          >
            <option value="">Choose action...</option>
            <option value="detect">Run Detection</option>
            <option value="redetect">Re-detect</option>
            <option value="update">Batch Update</option>
            <option value="delete">Delete</option>
          </select>

          {batchAction === 'update' && (
            <>
              <select value={batchGenre} onChange={(e) => setBatchGenre(e.target.value)} className={selectCls} style={selectStyle}>
                <option value="">Genre...</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={batchDetectionStatus} onChange={(e) => setBatchDetectionStatus(e.target.value)} className={selectCls} style={selectStyle}>
                <option value="">Detection status...</option>
                {DETECTION_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="relative inline-block">
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
                      sublabel: a.set_count ? `${a.set_count} sets` : undefined
                    }))
                  }}
                  placeholder="Artist..."
                  className="!text-xs !py-1.5"
                />
              </div>
              <div className="relative inline-block">
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
                      sublabel: (e.series as string) || undefined
                    }))
                  }}
                  placeholder="Event/Festival..."
                  className="!text-xs !py-1.5"
                />
              </div>
              <input
                value={batchVenue}
                onChange={(e) => setBatchVenue(e.target.value)}
                placeholder="Venue (stage/room)..."
                className="px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                style={selectStyle}
              />
            </>
          )}

          <Button
            variant={batchAction === 'delete' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleBatch}
            disabled={!batchAction || isBatching}
          >
            {isBatching ? 'Working...' : 'Apply'}
          </Button>

          <button
            onClick={() => { setSelectedIds(new Set()); setBatchAction(''); setBatchMsg(null) }}
            className="text-xs cursor-pointer ml-auto"
            style={{ color: 'oklch(var(--c3))' }}
          >
            Cancel
          </button>

          {batchMsg && (
            <p className="w-full text-xs mt-1" style={{ color: batchMsg.type === 'error' ? 'hsl(0, 60%, 55%)' : 'oklch(var(--h3))' }}>
              {batchMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Add Set modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add DJ Set"
        className="!max-w-4xl"
      >
        <SetsUploadTab onClose={() => setShowAddModal(false)} onSetCreated={() => { setShowAddModal(false); handleSetCreated() }} />
      </Modal>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: 'oklch(var(--c3))' }}>
            {debouncedSearch || activeFilterCount > 0 ? 'No sets match your filters.' : 'No sets in the catalog yet. Click "Add Set" to upload your first DJ set.'}
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <>
              {/* Table header */}
              <div
                className="flex items-center gap-3 px-4 py-2 mb-1 text-[10px] uppercase tracking-wider"
                style={{ color: 'oklch(var(--c3))' }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded shrink-0 cursor-pointer accent-[oklch(var(--h3))]"
                />
                <span className="flex-1 min-w-0">Title / Artist</span>
                <span className="w-20 text-center hidden sm:block">Genre</span>
                <span className="w-20 text-center hidden md:block">Source</span>
                <span className="w-16 text-center hidden md:block">Duration</span>
                <span className="w-24 text-center">Status</span>
                <span className="w-14 text-right hidden sm:block">Plays</span>
                <span className="w-12" />
              </div>

              {/* Set rows */}
              <div className="space-y-1.5">
            {sets.map((set) => {
              const isSelected = selectedIds.has(set.id)
              const sourceLabel = set.stream_type === 'invidious' ? 'YouTube'
                : set.stream_type === 'soundcloud' ? 'SoundCloud'
                : set.stream_type === 'hearthis' ? 'HearThis'
                : set.stream_type === 'r2' ? 'R2'
                : 'None'
              return (
                <div
                  key={set.id}
                  className="card !p-0 transition-all duration-150"
                  style={{
                    boxShadow: isSelected
                      ? 'inset 0 0 0 1px oklch(var(--h3) / 0.3), 0 0 0 1px oklch(var(--h3) / 0.1)'
                      : undefined,
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(set.id)}
                      className="w-3.5 h-3.5 rounded shrink-0 cursor-pointer accent-[oklch(var(--h3))]"
                    />
                    <Link to={`/app/sets/${set.id}`} className="flex-1 min-w-0 no-underline group">
                      <p className="text-sm font-[var(--font-weight-medium)] truncate group-hover:underline" style={{ color: 'oklch(var(--c1))' }}>
                        {set.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs truncate" style={{ color: 'oklch(var(--c3))' }}>{set.artist}</span>
                        {set.event && (
                          <span className="text-[10px] truncate max-w-28 hidden lg:inline" style={{ color: 'oklch(var(--c3) / 0.7)' }}>
                            {set.event}
                          </span>
                        )}
                      </div>
                    </Link>
                    <span className="w-20 text-center hidden sm:block">
                      {set.genre ? <Badge variant="muted">{set.genre}</Badge> : <span className="text-xs" style={{ color: 'oklch(var(--c3) / 0.4)' }}>—</span>}
                    </span>
                    <span className="w-20 text-center hidden md:block">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md inline-block"
                        style={{
                          background: sourceLabel === 'None' ? 'hsl(0 40% 30% / 0.15)' : 'oklch(var(--b4) / 0.4)',
                          color: sourceLabel === 'None' ? 'hsl(0, 50%, 60%)' : 'oklch(var(--c3))',
                        }}
                      >
                        {sourceLabel}
                      </span>
                    </span>
                    <span className="w-16 text-center text-xs font-mono hidden md:block" style={{ color: 'oklch(var(--c3))' }}>
                      {formatDuration(set.duration_seconds)}
                    </span>
                    <span className="w-24 text-center">
                      <div
                        className="inline-block relative group cursor-help"
                        title={`Metadata: ${isSetMetadataComplete(set) ? 'Complete' : 'Incomplete'} | Detection: ${set.detection_status}`}
                      >
                        <Badge variant={isSetMetadataComplete(set) ? 'accent' : 'muted'}>
                          {isSetMetadataComplete(set) ? 'Complete' : 'Incomplete'}
                        </Badge>
                        {/* Hover tooltip */}
                        <div
                          className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 px-2 py-1.5 rounded-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                          style={{ background: 'oklch(var(--b3))', color: 'oklch(var(--c1))', boxShadow: 'var(--menu-shadow)' }}
                        >
                          <div className="text-left">
                            <div>Event: {set.event_id ? '✓' : '✗'}</div>
                            <div>Genre: {set.genre ? '✓' : '✗'}</div>
                            <div>Source: {(set as any).stream_type && (set as any).stream_type !== 'none' ? '✓' : '✗'}</div>
                            <div>Detection: {set.detection_status}</div>
                          </div>
                        </div>
                      </div>
                    </span>
                    <span className="w-14 text-right text-xs font-mono hidden sm:block" style={{ color: 'oklch(var(--c3))' }}>
                      {set.play_count > 0 ? set.play_count : '—'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSet(set)} className="w-12 shrink-0">
                      Edit
                    </Button>
                  </div>
                </div>
              )
            })}
              </div>
            </>
          ) : (
            <>
              {/* Grid view */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sets.map((set) => {
                  const isSelected = selectedIds.has(set.id)
                  const sourceLabel = set.stream_type === 'invidious' ? 'YouTube'
                    : set.stream_type === 'soundcloud' ? 'SoundCloud'
                    : set.stream_type === 'hearthis' ? 'HearThis'
                    : set.stream_type === 'r2' ? 'R2'
                    : 'None'
                  return (
                    <div
                      key={set.id}
                      className="card !p-4 relative transition-all duration-150"
                      style={{
                        boxShadow: isSelected
                          ? 'inset 0 0 0 2px oklch(var(--h3) / 0.3), 0 0 0 1px oklch(var(--h3) / 0.1)'
                          : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(set.id)}
                        className="absolute top-3 right-3 w-4 h-4 rounded cursor-pointer accent-[oklch(var(--h3))]"
                      />
                      <Link to={`/app/sets/${set.id}`} className="no-underline group block mb-3">
                        <p className="text-base font-[var(--font-weight-medium)] group-hover:underline mb-1 pr-6" style={{ color: 'oklch(var(--c1))' }}>
                          {set.title}
                        </p>
                        <p className="text-sm mb-2" style={{ color: 'oklch(var(--c2))' }}>{set.artist}</p>
                        {set.event && (
                          <p className="text-xs truncate" style={{ color: 'oklch(var(--c3))' }}>
                            {set.event}
                          </p>
                        )}
                      </Link>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {set.genre && <Badge variant="muted">{set.genre}</Badge>}
                        <div
                          className="inline-block relative group cursor-help"
                          title={`Metadata: ${isSetMetadataComplete(set) ? 'Complete' : 'Incomplete'} | Detection: ${set.detection_status}`}
                        >
                          <Badge variant={isSetMetadataComplete(set) ? 'accent' : 'muted'}>
                            {isSetMetadataComplete(set) ? 'Complete' : 'Incomplete'}
                          </Badge>
                          {/* Hover tooltip */}
                          <div
                            className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 px-2 py-1.5 rounded-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                            style={{ background: 'oklch(var(--b3))', color: 'oklch(var(--c1))', boxShadow: 'var(--menu-shadow)' }}
                          >
                            <div className="text-left">
                              <div>Event: {set.event_id ? '✓' : '✗'}</div>
                              <div>Genre: {set.genre ? '✓' : '✗'}</div>
                              <div>Source: {(set as any).stream_type && (set as any).stream_type !== 'none' ? '✓' : '✗'}</div>
                              <div>Detection: {set.detection_status}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: 'oklch(var(--c3))' }}>
                        <span className="font-mono">{formatDuration(set.duration_seconds)}</span>
                        <span>{sourceLabel}</span>
                        <span>{set.play_count > 0 ? `${set.play_count} plays` : '—'}</span>
                      </div>
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid oklch(var(--b4) / 0.2)' }}>
                        <Button variant="ghost" size="sm" onClick={() => setEditingSet(set)} className="w-full justify-center">
                          Edit
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-xs" style={{ color: 'oklch(var(--c3))' }}>
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  style={{ color: 'oklch(var(--c2))', background: 'oklch(var(--b4) / 0.3)' }}
                >
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  style={{ color: 'oklch(var(--c2))', background: 'oklch(var(--b4) / 0.3)' }}
                >
                  Prev
                </button>

                {/* Page number pills — show up to 5 pages around current */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number
                  if (totalPages <= 5) {
                    p = i + 1
                  } else if (page <= 3) {
                    p = i + 1
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i
                  } else {
                    p = page - 2 + i
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-md text-xs transition-colors cursor-pointer"
                      style={{
                        background: p === page ? 'oklch(var(--h3) / 0.15)' : 'transparent',
                        color: p === page ? 'oklch(var(--h3))' : 'oklch(var(--c3))',
                        fontWeight: p === page ? 'var(--font-weight-medium)' : undefined,
                      }}
                    >
                      {p}
                    </button>
                  )
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  style={{ color: 'oklch(var(--c2))', background: 'oklch(var(--b4) / 0.3)' }}
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  style={{ color: 'oklch(var(--c2))', background: 'oklch(var(--b4) / 0.3)' }}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}
        </>
      )}

      {/* Edit set panel */}
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
