import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router'
import { useSession } from '../lib/auth-client'
import {
  fetchSets,
  fetchMLStats,
  fetchDetectionJobs,
  triggerDetection,
  evolvePrompt,
  redetectLowConfidence,
  deleteSetAdmin,
  updateSetAdmin,
  fetchArtists,
  fetchEvents,
  import1001Tracklists,
  type Track1001Preview,
} from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { AutocompleteInput, type AutocompleteOption } from '../components/ui/AutocompleteInput'
import { parse1001TracklistFromHtml } from '../lib/parse-1001tracklists'
import { formatRelativeTime, formatDuration } from '../lib/formatTime'
import { InviteCodesTab } from '../components/admin/InviteCodesTab'
import { SetsUploadTab } from '../components/admin/SetsUploadTab'
import { ModerationTab } from '../components/admin/ModerationTab'
import { UsersTab } from '../components/admin/UsersTab'
import { ArtistsTab } from '../components/admin/ArtistsTab'
import { EventsTab } from '../components/admin/EventsTab'
import { SongsTab } from '../components/admin/SongsTab'
import { GENRES } from '../lib/constants'
import type { DjSet } from '../lib/types'

type Tab = 'sets' | 'songs' | 'artists' | 'events' | 'users' | 'invites' | 'ml' | 'moderation'

interface MLStats {
  totalDetections: number
  confirmedCorrect: number
  corrected: number
  falsePositives: number
  missedTracks: number
  accuracyRate: number
  promptVersion: number
  feedbackPending: number
}

interface DetectionJob {
  id: string
  set_id: string
  status: string
  total_segments: number
  completed_segments: number
  detections_found: number
  error_message: string | null
  set_title: string
  set_artist: string
  created_at: string
  completed_at: string | null
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'sets', label: 'Sets', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
  { id: 'songs', label: 'Songs', icon: 'M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' },
  { id: 'artists', label: 'Artists', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  { id: 'events', label: 'Events', icon: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z' },
  { id: 'users', label: 'Users', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { id: 'invites', label: 'Invites', icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
  { id: 'moderation', label: 'Moderation', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z' },
  { id: 'ml', label: 'ML Pipeline', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
]

export function AdminPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('sets')

  // Check admin role
  if (session?.user?.role !== 'admin') {
    return (
      <div className="px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
        <p className="text-sm text-text-secondary">You need admin privileges to access this page.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--nav-height)-var(--player-height,72px))]">
      {/* Sidebar */}
      <nav
        className="w-[200px] shrink-0 py-6 pl-6 lg:pl-10 pr-4 flex flex-col gap-1 sticky top-0 self-start"
      >
        <h1
          className="text-sm font-[var(--font-weight-bold)] mb-4 px-3"
          style={{ color: 'hsl(var(--c2))' }}
        >
          Admin
        </h1>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap cursor-pointer transition-colors text-left w-full"
            style={{
              background: activeTab === tab.id ? 'hsl(var(--h3) / 0.1)' : undefined,
              color: activeTab === tab.id ? 'hsl(var(--h3))' : 'hsl(var(--c3))',
              transitionDuration: 'var(--trans)',
              transitionTimingFunction: 'var(--ease-out-custom)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'hsl(var(--c2))'
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'hsl(var(--c3))'
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d={tab.icon} />
            </svg>
            <span className={activeTab === tab.id ? 'font-[var(--font-weight-medium)]' : ''}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 min-w-0 py-6 pr-6 lg:pr-10 pl-4">
        {activeTab === 'sets' && <SetsListTab />}
        {activeTab === 'songs' && <SongsTab />}
        {activeTab === 'artists' && <ArtistsTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'invites' && <InviteCodesTab />}
        {activeTab === 'moderation' && <ModerationTab />}
        {activeTab === 'ml' && <MLPipelineTab />}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════
// SETS LIST TAB
// ═══════════════════════════════════════════

function SetsListTab() {
  const [sets, setSets] = useState<DjSet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingSet, setEditingSet] = useState<DjSet | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')

  const loadSets = () => {
    setIsLoading(true)
    fetchSets({ pageSize: 50 })
      .then((res) => setSets(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadSets() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return sets
    const q = search.toLowerCase()
    return sets.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.genre || '').toLowerCase().includes(q) ||
      (s.event || '').toLowerCase().includes(q)
    )
  }, [sets, search])

  const handleSetCreated = () => {
    setShowAddForm(false)
    loadSets()
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <p className="text-sm shrink-0" style={{ color: 'hsl(var(--c3))' }}>{filtered.length} set{filtered.length !== 1 ? 's' : ''}</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sets..."
          className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200"
          style={{
            background: 'hsl(var(--b4) / 0.4)',
            color: 'hsl(var(--c1))',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px hsl(var(--h3) / 0.5)' }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        />
        <Button variant="primary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Close' : 'Add Set'}
        </Button>
      </div>

      {/* Collapsible Add Set form */}
      {showAddForm && (
        <div className="card mb-5" style={{ borderLeft: '3px solid hsl(var(--h3) / 0.4)' }}>
          <SetsUploadTab onSetCreated={handleSetCreated} />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>
            {search ? 'No sets match your search.' : 'No sets in the catalog yet. Click "Add Set" to upload your first DJ set.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((set) => (
            <div key={set.id} className="card !p-4">
              <div className="flex items-center gap-4">
                <Link to={`/app/sets/${set.id}`} className="flex-1 min-w-0 no-underline">
                  <p className="text-sm font-[var(--font-weight-medium)] truncate hover:underline" style={{ color: 'hsl(var(--c1))' }}>{set.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{set.artist}</span>
                    {set.genre && <Badge variant="muted">{set.genre}</Badge>}
                    <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{formatDuration(set.duration_seconds)}</span>
                    {set.play_count > 0 && <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{set.play_count} plays</span>}
                  </div>
                </Link>
                <Badge
                  variant={
                    set.detection_status === 'complete' ? 'accent'
                      : set.detection_status === 'processing' ? 'default'
                      : 'muted'
                  }
                >
                  {set.detection_status}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setEditingSet(set)}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit set panel */}
      {editingSet && (
        <EditSetModal
          set={editingSet}
          onClose={() => setEditingSet(null)}
          onSaved={() => { setEditingSet(null); loadSets() }}
          onDeleted={(id) => { setSets((prev) => prev.filter((s) => s.id !== id)); setEditingSet(null) }}
        />
      )}
    </>
  )
}

/** Modal for editing set metadata */
function EditSetModal({ set, onClose, onSaved, onDeleted }: { set: DjSet; onClose: () => void; onSaved: () => void; onDeleted: (id: string) => void }) {
  const [tab, setTab] = useState<'metadata' | 'tracklist' | 'danger'>('metadata')

  // Metadata fields
  const [title, setTitle] = useState(set.title)
  const [artist, setArtist] = useState(set.artist)
  const [description, setDescription] = useState(set.description || '')
  const [genre, setGenre] = useState(set.genre || '')
  const [subgenre, setSubgenre] = useState(set.subgenre || '')
  const [venue, setVenue] = useState(set.venue || '')
  const [event, setEvent] = useState(set.event || '')
  const [tracklistUrl, setTracklistUrl] = useState(set.tracklist_1001_url || '')
  const [isSaving, setIsSaving] = useState(false)

  // Autocomplete
  const [artistId, setArtistId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  const fetchArtistOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchArtists(q)
    return (res.data || []).map((a: Record<string, unknown>) => ({ id: a.id as string, label: a.name as string, sublabel: a.set_count ? `${a.set_count} sets` : undefined }))
  }, [])

  const fetchEventOptions = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
    const res = await fetchEvents(q)
    return (res.data || []).map((e: Record<string, unknown>) => ({ id: e.id as string, label: e.name as string, sublabel: (e.series as string) || undefined }))
  }, [])

  // 1001Tracklists import
  const [tracklistHtml, setTracklistHtml] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [parsedTracks, setParsedTracks] = useState<Track1001Preview[]>([])
  const [tracklistMsg, setTracklistMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Detection
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectMsg, setDetectMsg] = useState<string | null>(null)

  // Delete
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteText, setConfirmDeleteText] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const inputClass = 'w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none'

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateSetAdmin(set.id, {
        title: title.trim(), artist: artist.trim(),
        description: description.trim() || null, genre: genre || null,
        subgenre: subgenre.trim() || null, venue: venue.trim() || null,
        event: event.trim() || null,
        tracklist_1001_url: tracklistUrl.trim() || null,
        artist_id: artistId || null,
        event_id: eventId || null,
      })
      setSuccess('Saved')
      setTimeout(() => { setSuccess(null); onSaved() }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleParse = () => {
    if (!tracklistHtml.trim()) return
    setIsParsing(true)
    setTracklistMsg(null)
    try {
      // Parse entirely client-side — no server round-trip needed
      const tracks = parse1001TracklistFromHtml(tracklistHtml)
      if (tracks.length === 0) {
        setTracklistMsg({ type: 'error', text: 'No tracks found. Paste the full page source (Ctrl+U).' })
      } else {
        setParsedTracks(tracks as Track1001Preview[])
      }
    } catch (err) {
      setTracklistMsg({ type: 'error', text: err instanceof Error ? err.message : 'Parse failed' })
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = async () => {
    if (parsedTracks.length === 0) return
    setIsImporting(true)
    setTracklistMsg(null)
    setImportProgress(`Importing ${parsedTracks.length} tracks...`)

    // Simulate progress steps while the server processes
    const steps = [
      { delay: 800, msg: 'Creating song records...' },
      { delay: 2500, msg: 'Enriching with Last.fm metadata...' },
      { delay: 5000, msg: 'Caching cover artwork...' },
      { delay: 8000, msg: 'Writing detections...' },
      { delay: 12000, msg: 'Almost done...' },
    ]
    const timers = steps.map((step) =>
      setTimeout(() => setImportProgress(step.msg), step.delay)
    )

    try {
      const res = await import1001Tracklists(set.id, parsedTracks)
      timers.forEach(clearTimeout)
      setTracklistMsg({ type: 'success', text: `Imported ${res.data.imported} tracks with song records. Tracklist is live.` })
      setParsedTracks([])
      setTracklistHtml('')
    } catch (err) {
      timers.forEach(clearTimeout)
      setTracklistMsg({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      setIsImporting(false)
      setImportProgress('')
    }
  }

  const handleDetect = async () => {
    setIsDetecting(true)
    setDetectMsg(null)
    try {
      const res = await triggerDetection(set.id)
      const data = ((res as Record<string, unknown>).data as Record<string, unknown>) || {}
      setDetectMsg(data.error ? `Failed: ${data.error}` : `Detected ${data.detections || 0} tracks`)
    } catch (err) {
      setDetectMsg(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleRedetect = async () => {
    setIsDetecting(true)
    setDetectMsg(null)
    try {
      await redetectLowConfidence(set.id)
      setDetectMsg('Re-detection triggered')
    } catch {
      setDetectMsg('Re-detection failed')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteSetAdmin(set.id)
      onDeleted(set.id)
    } catch { /* silent */ }
    finally { setIsDeleting(false) }
  }

  const tabs = [
    { id: 'metadata' as const, label: 'Metadata' },
    { id: 'tracklist' as const, label: 'Tracklist' },
    { id: 'danger' as const, label: 'Danger Zone' },
  ]

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${set.title}`}>
      <div className="min-w-0" style={{ maxHeight: '75vh', overflow: 'auto' }}>
        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'hsl(var(--b5) / 0.5)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? 'hsl(var(--h3) / 0.15)' : 'transparent',
                color: tab === t.id ? 'hsl(var(--h3))' : 'hsl(var(--c3))',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ METADATA TAB ═══ */}
        {tab === 'metadata' && (
          <div className="space-y-3">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Artist / DJ</label>
                <AutocompleteInput
                  value={artist} onChange={setArtist}
                  onSelect={(opt) => setArtistId(opt.id)}
                  onClear={() => setArtistId(null)}
                  selectedId={artistId}
                  fetchOptions={fetchArtistOptions}
                  placeholder="DJ name"
                />
              </div>
              <div>
                <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Event</label>
                <AutocompleteInput
                  value={event} onChange={setEvent}
                  onSelect={(opt) => setEventId(opt.id)}
                  onClear={() => setEventId(null)}
                  selectedId={eventId}
                  fetchOptions={fetchEventOptions}
                  placeholder="Boiler Room Berlin"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
              <Input label="Subgenre" value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" />
            </div>
            <div>
              <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>1001Tracklists URL</label>
              <input value={tracklistUrl} onChange={(e) => setTracklistUrl(e.target.value)} placeholder="https://www.1001tracklists.com/tracklist/..." className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
            </div>
            {error && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p>}
            {success && <p className="text-xs" style={{ color: 'hsl(var(--h3))' }}>{success}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={isSaving || !title.trim() || !artist.trim()} className="flex-1">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ TRACKLIST TAB ═══ */}
        {tab === 'tracklist' && (
          <div className="space-y-4">
            {/* Auto-detect section */}
            <div className="rounded-xl p-4" style={{ background: 'hsl(var(--b5) / 0.5)', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--c1))' }}>Auto-detect from YouTube</p>
              <p className="text-[10px] mb-3" style={{ color: 'hsl(var(--c3))' }}>
                Parses the YouTube description and comments via Invidious + AI. Falls back if no 1001tracklists data is available.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDetect} disabled={isDetecting}>
                  {isDetecting ? 'Detecting...' : 'Run Detection'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRedetect} disabled={isDetecting}>
                  Re-detect Low Confidence
                </Button>
              </div>
              {detectMsg && (
                <p className="text-[10px] mt-2" style={{ color: detectMsg.includes('Failed') || detectMsg.includes('failed') ? 'hsl(0, 60%, 55%)' : 'hsl(var(--h3))' }}>
                  {detectMsg}
                </p>
              )}
            </div>

            {/* Manual 1001tracklists paste */}
            <div className="rounded-xl p-4" style={{ background: 'hsl(var(--b5) / 0.5)', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.3)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--c1))' }}>Import from 1001Tracklists</p>
              <p className="text-[10px] mb-3" style={{ color: 'hsl(var(--c3))' }}>
                Open the 1001tracklists page → <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'hsl(var(--b3))', color: 'hsl(var(--c2))' }}>Ctrl+U</kbd> → <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'hsl(var(--b3))', color: 'hsl(var(--c2))' }}>Ctrl+A</kbd> → copy → paste below. This replaces all existing detections.
              </p>
              <textarea
                value={tracklistHtml}
                onChange={(e) => setTracklistHtml(e.target.value)}
                placeholder="Paste full page source HTML..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono placeholder:text-text-muted focus:outline-none resize-none"
                style={{ background: 'hsl(var(--b6))', color: 'hsl(var(--c2))', boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={handleParse} disabled={isParsing || !tracklistHtml.trim()}>
                  {isParsing ? 'Parsing...' : 'Parse'}
                </Button>
                {parsedTracks.length > 0 && (
                  <Button variant="primary" size="sm" onClick={handleImport} disabled={isImporting}>
                    {isImporting ? 'Importing...' : `Import ${parsedTracks.length} tracks`}
                  </Button>
                )}
                {tracklistHtml.trim() && (
                  <span className="text-[10px] font-mono ml-auto" style={{ color: 'hsl(var(--c3))' }}>
                    {(tracklistHtml.length / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
              {tracklistMsg && (
                <p className="text-[10px] mt-2" style={{ color: tracklistMsg.type === 'error' ? 'hsl(0, 60%, 55%)' : 'hsl(var(--h3))' }}>
                  {tracklistMsg.text}
                </p>
              )}
              {isImporting && importProgress && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--h3) / 0.06)' }}>
                  <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: 'hsl(var(--h3) / 0.3)', borderTopColor: 'hsl(var(--h3))' }} />
                  <span className="text-[11px]" style={{ color: 'hsl(var(--h3))' }}>{importProgress}</span>
                </div>
              )}
            </div>

            {/* Parsed tracks preview */}
            {parsedTracks.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)' }}>
                <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'hsl(var(--b5) / 0.5)' }}>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--h3))' }}>{parsedTracks.length} tracks</span>
                  <button className="text-[10px]" style={{ color: 'hsl(var(--c3))' }} onClick={() => { setParsedTracks([]); setTracklistHtml('') }}>Clear</button>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {parsedTracks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px]" style={{ borderTop: i > 0 ? '1px solid hsl(var(--b4) / 0.1)' : undefined }}>
                      {t.artwork_url ? (
                        <img src={t.artwork_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded shrink-0" style={{ background: 'hsl(var(--b4) / 0.4)' }} />
                      )}
                      <span className="w-8 text-right font-mono shrink-0" style={{ color: t.is_continuation ? 'hsl(var(--h3) / 0.5)' : 'hsl(var(--c3))' }}>
                        {t.is_continuation ? 'w/' : t.cue_time || String(t.position).padStart(2, '0')}
                      </span>
                      <span className="truncate flex-1" style={{ color: 'hsl(var(--c1))' }}>
                        {t.artist} - {t.title}
                      </span>
                      {t.label && <span className="shrink-0 truncate max-w-20" style={{ color: 'hsl(var(--c3))' }}>[{t.label}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ DANGER ZONE ═══ */}
        {tab === 'danger' && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'hsl(0, 50%, 15% / 0.3)', boxShadow: 'inset 0 0 0 1px hsl(0, 50%, 30% / 0.3)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'hsl(0, 60%, 65%)' }}>Delete this set</p>
              <p className="text-[10px] mb-3" style={{ color: 'hsl(var(--c3))' }}>
                Permanently removes this set, all detections, annotations, votes, and audio. This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  placeholder={`Type "${set.id.slice(0, 6)}" to confirm`}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none"
                  style={{ background: 'hsl(var(--b6))', color: 'hsl(var(--c2))', boxShadow: 'inset 0 0 0 1px hsl(0, 50%, 30% / 0.3)' }}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || confirmDeleteText !== set.id.slice(0, 6)}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Set'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════
// ML PIPELINE TAB
// ═══════════════════════════════════════════

function MLPipelineTab() {
  const [stats, setStats] = useState<MLStats | null>(null)
  const [jobs, setJobs] = useState<DetectionJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [evolving, setEvolving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsRes, jobsRes] = await Promise.all([fetchMLStats(), fetchDetectionJobs()])
      setStats(statsRes.data)
      setJobs(jobsRes.data)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleEvolve = async () => {
    setEvolving(true)
    try {
      await evolvePrompt()
      await loadData()
    } catch {
      // silent
    } finally {
      setEvolving(false)
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Detections" value={stats.totalDetections} />
          <StatCard label="Accuracy" value={`${Math.round(stats.accuracyRate * 100)}%`} accent />
          <StatCard label="Prompt Version" value={`v${stats.promptVersion}`} />
          <StatCard label="Pending Feedback" value={stats.feedbackPending} />
        </div>
      )}
      <div className="flex gap-3 mb-6">
        <Button variant="primary" onClick={handleEvolve} disabled={evolving}>
          {evolving ? 'Evolving...' : 'Evolve Prompt'}
        </Button>
        <Button variant="secondary" onClick={loadData}>Refresh</Button>
      </div>
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="card !p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-[var(--font-weight-medium)] truncate" style={{ color: 'hsl(var(--c1))' }}>{job.set_title} - {job.set_artist}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>{job.completed_segments}/{job.total_segments} segments{job.detections_found > 0 && ` · ${job.detections_found} tracks`}</p>
              </div>
              <Badge variant={job.status === 'complete' ? 'accent' : job.status === 'failed' ? 'default' : 'muted'}>{job.status}</Badge>
              <span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>{formatRelativeTime(job.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs mb-1" style={{ color: 'hsl(var(--c3))' }}>{label}</p>
      <p className="text-2xl font-[var(--font-weight-bold)]" style={{ color: accent ? 'hsl(var(--h3))' : 'hsl(var(--c1))' }}>{value}</p>
    </div>
  )
}
