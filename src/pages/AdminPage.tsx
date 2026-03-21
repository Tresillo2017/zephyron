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
} from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { formatRelativeTime, formatDuration } from '../lib/formatTime'
import { InviteCodesTab } from '../components/admin/InviteCodesTab'
import { SetsUploadTab } from '../components/admin/SetsUploadTab'
import { ModerationTab } from '../components/admin/ModerationTab'
import { UsersTab } from '../components/admin/UsersTab'
import { ArtistsTab } from '../components/admin/ArtistsTab'
import { EventsTab } from '../components/admin/EventsTab'
import { GENRES } from '../lib/constants'
import type { DjSet } from '../lib/types'

type Tab = 'sets' | 'artists' | 'events' | 'users' | 'invites' | 'ml' | 'moderation'

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
  const [triggering, setTriggering] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingSet, setEditingSet] = useState<DjSet | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [reuploadId, setReuploadId] = useState<string | null>(null)
  const [reuploadFile, setReuploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')

  const [detectResult, setDetectResult] = useState<Record<string, { detections: number; error?: string } | null>>({})

  const loadSets = () => {
    setIsLoading(true)
    fetchSets({ pageSize: 50 })
      .then((res) => setSets(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

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

  const handleTrigger = async (setId: string) => {
    setTriggering(setId)
    setDetectResult((prev) => ({ ...prev, [setId]: null }))
    try {
      const res = await triggerDetection(setId)
      const data = (res as any).data || {}
      setSets((prev) => prev.map((s) => s.id === setId ? { ...s, detection_status: (data.status || 'complete') as any } : s))
      setDetectResult((prev) => ({ ...prev, [setId]: { detections: data.detections || 0, error: data.error } }))
    } catch (err) {
      setDetectResult((prev) => ({ ...prev, [setId]: { detections: 0, error: err instanceof Error ? err.message : 'Failed' } }))
    }
    finally { setTriggering(null) }
  }

  const handleDelete = async (setId: string) => {
    setDeleting(setId)
    try {
      await deleteSetAdmin(setId)
      setSets((prev) => prev.filter((s) => s.id !== setId))
      setConfirmDelete(null)
    } catch { /* silent */ }
    finally { setDeleting(null) }
  }

  const handleReupload = async (setId: string) => {
    if (!reuploadFile) return
    setUploading(true)
    try {
      await fetch(`/api/admin/sets/${setId}/upload`, {
        method: 'PUT',
        headers: { 'Content-Type': reuploadFile.type || 'audio/mpeg' },
        body: reuploadFile,
      })
      setReuploadId(null)
      setReuploadFile(null)
      loadSets()
    } catch { /* silent */ }
    finally { setUploading(false) }
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
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleTrigger(set.id)}
                    disabled={triggering === set.id || set.detection_status === 'processing'}
                  >
                    {triggering === set.id ? '...' : 'Detect'}
                  </Button>
                  {set.detection_status === 'complete' && (
                    <Button variant="ghost" size="sm" onClick={async () => { await redetectLowConfidence(set.id) }}>
                      Re-detect
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditingSet(set)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setReuploadId(set.id)}>Upload</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(set.id)}>Delete</Button>
                </div>
              </div>
              {/* Inline detection result */}
              {detectResult[set.id] && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
                  detectResult[set.id]!.error
                    ? 'bg-danger/10 text-danger'
                    : 'bg-accent/10 text-accent'
                }`}>
                  {detectResult[set.id]!.error
                    ? `Detection failed: ${detectResult[set.id]!.error}`
                    : `Detected ${detectResult[set.id]!.detections} tracks`}
                </div>
              )}
              {triggering === set.id && (
                <div className="mt-3 px-3 py-2 rounded-lg text-xs animate-pulse" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c3))' }}>
                  Analyzing YouTube description &amp; comments, enriching with Last.fm...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Set">
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>
          Are you sure you want to delete this set? This will remove all detections, annotations, votes, and the audio file from R2. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
          <Button
            variant="danger"
            onClick={() => confirmDelete && handleDelete(confirmDelete)}
            disabled={deleting === confirmDelete}
            className="flex-1"
          >
            {deleting ? 'Deleting...' : 'Delete Set'}
          </Button>
        </div>
      </Modal>

      {/* Edit set modal */}
      {editingSet && (
        <EditSetModal
          set={editingSet}
          onClose={() => setEditingSet(null)}
          onSaved={() => { setEditingSet(null); loadSets() }}
        />
      )}

      {/* Re-upload audio modal */}
      <Modal isOpen={!!reuploadId} onClose={() => { setReuploadId(null); setReuploadFile(null) }} title="Upload / Replace Audio">
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>
          Select an audio file to upload (or replace existing audio) for this set.
        </p>
        <input
          type="file"
          accept="audio/mpeg,audio/flac,audio/wav,.mp3,.flac,.wav"
          onChange={(e) => setReuploadFile(e.target.files?.[0] || null)}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer mb-4"
          style={{ color: 'hsl(var(--c2))' }}
        />
        {reuploadFile && (
          <p className="text-xs mb-4" style={{ color: 'hsl(var(--c3))' }}>{reuploadFile.name} ({(reuploadFile.size / 1048576).toFixed(1)} MB)</p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setReuploadId(null); setReuploadFile(null) }} className="flex-1">Cancel</Button>
          <Button
            variant="primary"
            onClick={() => reuploadId && handleReupload(reuploadId)}
            disabled={!reuploadFile || uploading}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </Modal>
    </>
  )
}

/** Modal for editing set metadata */
function EditSetModal({ set, onClose, onSaved }: { set: DjSet; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(set.title)
  const [artist, setArtist] = useState(set.artist)
  const [description, setDescription] = useState(set.description || '')
  const [genre, setGenre] = useState(set.genre || '')
  const [subgenre, setSubgenre] = useState(set.subgenre || '')
  const [venue, setVenue] = useState(set.venue || '')
  const [event, setEvent] = useState(set.event || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await updateSetAdmin(set.id, {
        title: title.trim(),
        artist: artist.trim(),
        description: description.trim() || null,
        genre: genre || null,
        subgenre: subgenre.trim() || null,
        venue: venue.trim() || null,
        event: event.trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Edit Set">
      <div className="space-y-3">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Artist / DJ" value={artist} onChange={(e) => setArtist(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
          <Input label="Event" value={event} onChange={(e) => setEvent(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Genre</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }}>
              <option value="">None</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <Input label="Subgenre" value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" />
        </div>
        <div>
          <label className="text-sm font-[var(--font-weight-medium)] block mb-1.5" style={{ color: 'hsl(var(--c2))' }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c1))' }} />
        </div>
        {error && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !title.trim() || !artist.trim()} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
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
