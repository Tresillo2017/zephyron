import { useState, useEffect, useCallback } from 'react'
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
import { GENRES } from '../lib/constants'
import type { DjSet } from '../lib/types'

type Tab = 'sets' | 'upload' | 'artists' | 'users' | 'invites' | 'ml' | 'moderation'

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

const TABS: { id: Tab; label: string }[] = [
  { id: 'sets', label: 'Sets' },
  { id: 'upload', label: 'Add Set' },
  { id: 'artists', label: 'Artists' },
  { id: 'users', label: 'Users' },
  { id: 'invites', label: 'Invite Codes' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'ml', label: 'ML Pipeline' },
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
    <div className="px-5 sm:px-8 py-8 sm:py-12 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Admin Dashboard</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-accent border-accent'
                : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sets' && <SetsListTab />}
      {activeTab === 'upload' && <SetsUploadTab />}
      {activeTab === 'artists' && <ArtistsTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'invites' && <InviteCodesTab />}
      {activeTab === 'moderation' && <ModerationTab />}
      {activeTab === 'ml' && <MLPipelineTab />}
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

  const [detectResult, setDetectResult] = useState<Record<string, { detections: number; error?: string } | null>>({})

  const loadSets = () => {
    setIsLoading(true)
    fetchSets({ pageSize: 50 })
      .then((res) => setSets(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadSets() }, [])

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

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />

  if (sets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted text-sm mb-4">No sets in the catalog yet.</p>
        <p className="text-xs text-text-muted">Use the "Add Set" tab to upload your first DJ set.</p>
      </div>
    )
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {sets.map((set, index) => (
          <div
            key={set.id}
            className={`px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <div className="flex items-center gap-3">
            <Link to={`/app/sets/${set.id}`} className="flex-1 min-w-0 no-underline">
              <p className="text-sm text-text-primary truncate hover:underline">{set.title}</p>
              <p className="text-xs text-text-secondary truncate">{set.artist}{set.genre ? ` · ${set.genre}` : ''}</p>
              <p className="text-[10px] text-text-muted">{formatDuration(set.duration_seconds)}{set.play_count > 0 ? ` · ${set.play_count} plays` : ''}</p>
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
            <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
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
              <Button variant="ghost" size="sm" onClick={() => setEditingSet(set)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReuploadId(set.id)}>
                Upload Audio
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(set.id)}>
                Delete
              </Button>
            </div>
            </div>
            {/* Inline detection result */}
            {detectResult[set.id] && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-xs ${
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
              <div className="mt-2 px-3 py-2 rounded-lg bg-surface-overlay text-xs text-text-muted animate-pulse">
                Analyzing YouTube description &amp; comments, enriching with Last.fm...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Set">
        <p className="text-sm text-text-secondary mb-4">
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
        <p className="text-sm text-text-secondary mb-4">
          Select an audio file to upload (or replace existing audio) for this set.
        </p>
        <input
          type="file"
          accept="audio/mpeg,audio/flac,audio/wav,.mp3,.flac,.wav"
          onChange={(e) => setReuploadFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer mb-4"
        />
        {reuploadFile && (
          <p className="text-xs text-text-muted mb-4">{reuploadFile.name} ({(reuploadFile.size / 1048576).toFixed(1)} MB)</p>
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
            <label className="text-sm font-medium text-text-secondary block mb-1.5">Genre</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full px-3 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="">None</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <Input label="Subgenre" value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g. Dark Techno" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none" />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
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
        <div className="border border-border rounded-lg overflow-hidden">
          {jobs.map((job, index) => (
            <div key={job.id} className={`flex items-center gap-4 px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{job.set_title} - {job.set_artist}</p>
                <p className="text-xs text-text-muted">{job.completed_segments}/{job.total_segments} segments{job.detections_found > 0 && ` · ${job.detections_found} tracks`}</p>
              </div>
              <Badge variant={job.status === 'complete' ? 'accent' : job.status === 'failed' ? 'default' : 'muted'}>{job.status}</Badge>
              <span className="text-xs text-text-muted">{formatRelativeTime(job.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}
