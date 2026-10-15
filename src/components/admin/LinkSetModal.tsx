import { useState, useEffect } from 'react'
import { AddFilled } from '@mingcute/react/core-filled'
import { fetchSets, fetchEvent, linkSetToEvent, unlinkSetFromEvent } from '../../lib/api'
import { cn } from '../../lib/cn'
import { inputClass } from '../bleh'
import { AdminButton, AdminModal } from './adminUi'

type LinkSection = 'linked' | 'add'

function SetLine({ title, artist }: { title: string; artist: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[14px] text-heading">{title}</p>
      <p className="truncate text-[12px] text-muted">{artist}</p>
    </div>
  )
}

function matchesSearch(set: { title?: string; artist?: string }, search: string): boolean {
  if (!search) return true
  const q = search.toLowerCase()
  return !!set.title?.toLowerCase().includes(q) || !!set.artist?.toLowerCase().includes(q)
}

function SectionToggle({ active, counts, onChange }: {
  active: LinkSection; counts: Record<LinkSection, number>; onChange: (section: LinkSection) => void
}) {
  const labels: Record<LinkSection, string> = { linked: 'Linked', add: 'Add Sets' }
  return (
    <div className="flex gap-1 rounded-lg bg-b4/30 p-1">
      {(['linked', 'add'] as const).map((section) => (
        <button
          key={section}
          type="button"
          aria-pressed={active === section}
          onClick={() => onChange(section)}
          className={cn(
            'flex-1 cursor-pointer rounded-md py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2',
            active === section ? 'bg-b3 text-heading' : 'text-muted hover:text-text',
          )}
        >
          {labels[section]} ({counts[section]})
        </button>
      ))}
    </div>
  )
}

function LinkedSetRows({ sets, search, working, onUnlink }: {
  sets: any[]; search: string; working: string | null; onUnlink: (setId: string) => void
}) {
  const visible = sets.filter((s) => matchesSearch(s, search))
  if (visible.length === 0) {
    return <p className="py-4 text-center text-[13px] text-muted">{search ? 'No linked sets match.' : 'No sets linked yet.'}</p>
  }
  return (
    <>
      {visible.map((set: any) => (
        <div key={set.id} className="flex items-center gap-3 rounded-lg bg-b4/20 px-3 py-2.5">
          <SetLine title={set.title} artist={set.artist} />
          <AdminButton variant="danger" size="sm" onClick={() => onUnlink(set.id)} disabled={working === set.id}>
            {working === set.id ? '...' : 'Unlink'}
          </AdminButton>
        </div>
      ))}
    </>
  )
}

function UnlinkedSetRows({ sets, search, working, onLink }: {
  sets: any[]; search: string; working: string | null; onLink: (setId: string) => void
}) {
  const visible = sets.filter((s) => matchesSearch(s, search))
  if (visible.length === 0) {
    return <p className="py-4 text-center text-[13px] text-muted">{search ? 'No sets match.' : 'All sets are already linked.'}</p>
  }
  return (
    <>
      {visible.map((set) => (
        <button
          key={set.id}
          type="button"
          onClick={() => onLink(set.id)}
          disabled={working === set.id}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-b3/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 disabled:cursor-default disabled:opacity-60"
        >
          <SetLine title={set.title} artist={set.artist} />
          {working === set.id ? (
            <span className="shrink-0 text-[12px] text-muted">Linking...</span>
          ) : (
            <AddFilled size={16} aria-hidden="true" className="shrink-0 text-muted" />
          )}
        </button>
      ))}
    </>
  )
}

export function LinkSetModal({ eventId, onClose, onChanged }: { eventId: string; onClose: () => void; onChanged: () => void }) {
  const [allSets, setAllSets] = useState<any[]>([])
  const [linkedSets, setLinkedSets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<LinkSection>('linked')

  const load = () => {
    Promise.all([
      fetchSets({ pageSize: 200 }),
      fetchEvent(eventId),
    ]).then(([allRes, eventRes]) => {
      setAllSets(allRes.data)
      setLinkedSets(eventRes.data?.sets || [])
    }).catch(() => {}).finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [eventId])

  const linkedIds = new Set(linkedSets.map((s: any) => s.id))
  const unlinkedSets = allSets.filter((s) => !linkedIds.has(s.id))

  const handleLink = async (setId: string) => {
    setWorking(setId)
    try { await linkSetToEvent(eventId, setId); onChanged(); load() } catch { /* ignore */ } finally { setWorking(null) }
  }

  const handleUnlink = async (setId: string) => {
    setWorking(setId)
    try { await unlinkSetFromEvent(eventId, setId); onChanged(); load() } catch { /* ignore */ } finally { setWorking(null) }
  }

  return (
    <AdminModal isOpen onClose={onClose} title="Manage Linked Sets" size="md">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          aria-label="Search sets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sets..."
          className={inputClass}
        />

        <SectionToggle
          active={activeSection}
          counts={{ linked: linkedSets.length, add: unlinkedSets.length }}
          onChange={setActiveSection}
        />

        {isLoading ? (
          <p className="py-4 text-center text-[13px] text-muted">Loading...</p>
        ) : (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {activeSection === 'linked' ? (
              <LinkedSetRows sets={linkedSets} search={search} working={working} onUnlink={handleUnlink} />
            ) : (
              <UnlinkedSetRows sets={unlinkedSets} search={search} working={working} onLink={handleLink} />
            )}
          </div>
        )}
      </div>
    </AdminModal>
  )
}
