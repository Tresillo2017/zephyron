import { useState, useEffect } from 'react'
import { fetchSets, fetchEvent, linkSetToEvent, unlinkSetFromEvent } from '../../lib/api'
import { Modal } from '../ui/Modal'

export function LinkSetModal({ eventId, onClose, onChanged }: { eventId: string; onClose: () => void; onChanged: () => void }) {
   
  const [allSets, setAllSets] = useState<any[]>([])
   
  const [linkedSets, setLinkedSets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<'linked' | 'add'>('linked')

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

  const filteredLinked = linkedSets.filter((s: any) =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredUnlinked = unlinkedSets.filter((s) =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase())
  )

  const handleLink = async (setId: string) => {
    setWorking(setId)
    try { await linkSetToEvent(eventId, setId); onChanged(); load() } catch { /* ignore */ } finally { setWorking(null) }
  }

  const handleUnlink = async (setId: string) => {
    setWorking(setId)
    try { await unlinkSetFromEvent(eventId, setId); onChanged(); load() } catch { /* ignore */ } finally { setWorking(null) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Manage Linked Sets">
      <div className="space-y-3">
        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sets..."
          className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-text-muted focus:outline-none"
          style={{ background: 'oklch(var(--b4) / 0.4)', color: 'oklch(var(--c1))' }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px oklch(var(--h3) / 0.5)' }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        />

        {/* Section toggle */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'oklch(var(--b4) / 0.3)' }}>
          {(['linked', 'add'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all border-none cursor-pointer"
              style={{
                background: activeSection === section ? 'oklch(var(--b3))' : 'transparent',
                color: activeSection === section ? 'oklch(var(--c1))' : 'oklch(var(--c3))',
              }}
            >
              {section === 'linked' ? `Linked (${linkedSets.length})` : `Add Sets (${unlinkedSets.length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm py-4 text-center" style={{ color: 'oklch(var(--c3))' }}>Loading...</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {activeSection === 'linked' && (
              <>
                {filteredLinked.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'oklch(var(--c3))' }}>
                    {search ? 'No linked sets match.' : 'No sets linked yet.'}
                  </p>
                ) : filteredLinked.map((set: any) => (
                  <div key={set.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'oklch(var(--b4) / 0.2)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'oklch(var(--c1))' }}>{set.title}</p>
                      <p className="text-xs truncate" style={{ color: 'oklch(var(--c3))' }}>{set.artist}</p>
                    </div>
                    <button
                      onClick={() => handleUnlink(set.id)}
                      disabled={working === set.id}
                      className="shrink-0 px-2 py-1 rounded-md text-xs transition-colors border-none cursor-pointer"
                      style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 60% 50% / 0.25)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 60% 50% / 0.15)' }}
                    >
                      {working === set.id ? '...' : 'Unlink'}
                    </button>
                  </div>
                ))}
              </>
            )}

            {activeSection === 'add' && (
              <>
                {filteredUnlinked.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'oklch(var(--c3))' }}>
                    {search ? 'No sets match.' : 'All sets are already linked.'}
                  </p>
                ) : filteredUnlinked.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => handleLink(set.id)}
                    disabled={working === set.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border-none cursor-pointer"
                    style={{ color: 'oklch(var(--c2))' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'oklch(var(--b3) / 0.4)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'oklch(var(--c1))' }}>{set.title}</p>
                      <p className="text-xs truncate" style={{ color: 'oklch(var(--c3))' }}>{set.artist}</p>
                    </div>
                    {working === set.id ? (
                      <span className="text-xs shrink-0" style={{ color: 'oklch(var(--c3))' }}>Linking...</span>
                    ) : (
                      <svg className="w-4 h-4 shrink-0" style={{ color: 'oklch(var(--c3))' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
