import { useState, useEffect, useMemo } from 'react'
import { AddFilled, ArrowDownFilled, DeleteFilled, GridFilled, Link2Filled, ListCheckFilled, PencilFilled, Search2Filled } from '@mingcute/react/core-filled'
import { fetchEvents, deleteEventAdmin, getEventCoverUrl } from '../../lib/api'
import { cn } from '../../lib/cn'
import { Card, IconButton, Skeleton, Table, THead, TBody, Tr, Th, Td, inputClass } from '../bleh'
import { AdminBadge, AdminButton, AdminModal, RowMenu, cellMono, cellMuted, type RowMenuItem } from './adminUi'
import type { Event } from './eventTypes'
import { EventFormModal } from './EventFormModal'
import { LinkSetModal } from './LinkSetModal'
import { ImportSetsModal } from './ImportSetsModal'

type ViewMode = 'list' | 'grid'

interface EventActions {
  onImport: (event: Event) => void
  onManage: (eventId: string) => void
  onEdit: (event: Event) => void
  onDelete: (eventId: string) => void
}

/** Extract year from DB year column, start_date, or event name (fallback) */
function getEventYear(event: Event): string | null {
  if (event.year) return String(event.year)
  if (event.start_date) {
    const match = event.start_date.match(/^(\d{4})/)
    if (match) return match[1]
  }
  const nameMatch = event.name.match(/\b(20\d{2})\b/)
  return nameMatch ? nameMatch[1] : null
}

function buildRowMenuItems(event: Event, actions: EventActions): RowMenuItem[] {
  const items: RowMenuItem[] = []
  if (event.source_1001_id) {
    items.push({ label: 'Import Sets', icon: <ArrowDownFilled />, onSelect: () => actions.onImport(event) })
  }
  items.push(
    { label: 'Manage Sets', icon: <Link2Filled />, onSelect: () => actions.onManage(event.id) },
    { label: 'Edit', icon: <PencilFilled />, onSelect: () => actions.onEdit(event) },
    { type: 'separator' },
    { label: 'Delete', icon: <DeleteFilled />, tone: 'danger', onSelect: () => actions.onDelete(event.id) },
  )
  return items
}

function EventCover({ event, refreshKey, className, letterClass }: {
  event: Event; refreshKey: number; className: string; letterClass: string
}) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden bg-b4 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--b4),transparent_75%)]', className)}>
      {event.cover_image_r2_key ? (
        <img src={`${getEventCoverUrl(event.id)}?v=${refreshKey}`} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className={cn('font-medium text-muted/60', letterClass)}>{event.name.charAt(0)}</span>
      )}
    </div>
  )
}

function EventsToolbar({ count, search, onSearch, viewMode, onViewMode, onCreate }: {
  count: number; search: string; onSearch: (value: string) => void
  viewMode: ViewMode; onViewMode: (mode: ViewMode) => void; onCreate: () => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs flex-1">
        <Search2Filled size={14} className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search events"
          placeholder="Search events..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className={inputClass + ' pl-9'}
        />
      </div>
      <p className="shrink-0 text-[13px] tabular-nums text-muted">
        {count} event{count !== 1 ? 's' : ''}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <IconButton label="List view" size="sm" tooltip={false} variant={viewMode === 'list' ? 'filled' : 'subtle'} aria-pressed={viewMode === 'list'} onClick={() => onViewMode('list')}>
          <ListCheckFilled />
        </IconButton>
        <IconButton label="Grid view" size="sm" tooltip={false} variant={viewMode === 'grid' ? 'filled' : 'subtle'} aria-pressed={viewMode === 'grid'} onClick={() => onViewMode('grid')}>
          <GridFilled />
        </IconButton>
        <AdminButton size="sm" variant="primary" onClick={onCreate}>
          <AddFilled />
          Create Event
        </AdminButton>
      </div>
    </div>
  )
}

function EventListTable({ events, refreshKey, actions }: { events: Event[]; refreshKey: number; actions: EventActions }) {
  return (
    <Table>
      <THead>
        <Tr>
          <Th>Event</Th>
          <Th className="w-40">Series</Th>
          <Th className="w-40">Location</Th>
          <Th className="w-20 text-right">Sets</Th>
          <Th className="w-10"><span className="sr-only">Actions</span></Th>
        </Tr>
      </THead>
      <TBody>
        {events.map((event) => {
          const year = getEventYear(event)
          return (
            <Tr key={event.id}>
              <Td className="min-w-0 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <EventCover event={event} refreshKey={refreshKey} className="size-9 rounded-lg" letterClass="text-[13px]" />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-heading">{event.name}</span>
                      {year && <span className={cn(cellMono, 'shrink-0 text-[12px] tracking-normal')}>{year}</span>}
                    </div>
                    {event.source_1001_id && <p className={cn(cellMono, 'text-[11px] tracking-normal')}>1001TL:{event.source_1001_id}</p>}
                  </div>
                </div>
              </Td>
              <Td className="py-2">
                {event.series ? <AdminBadge variant="muted">{event.series}</AdminBadge> : <span className={cellMuted}>—</span>}
              </Td>
              <Td className={cn('truncate py-2', cellMuted)}>{event.location || '—'}</Td>
              <Td className="py-2 text-right font-mono text-[13px] tabular-nums text-text">{event.set_count}</Td>
              <Td className="py-2 text-right">
                <RowMenu label={`Actions for ${event.name}`} items={buildRowMenuItems(event, actions)} />
              </Td>
            </Tr>
          )
        })}
      </TBody>
    </Table>
  )
}

function EventGrid({ events, refreshKey, actions }: { events: Event[]; refreshKey: number; actions: EventActions }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => {
        const year = getEventYear(event)
        return (
          <Card key={event.id} padded={false} className="flex flex-col gap-3 p-4">
            <EventCover event={event} refreshKey={refreshKey} className="aspect-video w-full rounded-lg" letterClass="text-3xl" />
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-medium text-heading">{event.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {event.location && <span className={cellMuted}>{event.location}</span>}
                {year && <span className={cn(cellMono, 'text-[12px] tracking-normal')}>{year}</span>}
                {event.series && <AdminBadge variant="muted">{event.series}</AdminBadge>}
              </div>
            </div>
            {event.description && <p className="line-clamp-2 text-[13px] text-muted">{event.description}</p>}
            <div className="flex items-center gap-2 font-mono text-[12px] text-muted">
              <span>{event.set_count} set{event.set_count !== 1 ? 's' : ''}</span>
              {event.source_1001_id && <span className="text-accent-2">1001TL:{event.source_1001_id}</span>}
            </div>
            <div className="mt-auto flex flex-col gap-1.5">
              {event.source_1001_id && (
                <AdminButton variant="secondary" size="sm" onClick={() => actions.onImport(event)} className="w-full">
                  Import Sets
                </AdminButton>
              )}
              <div className="flex gap-1.5">
                <AdminButton variant="ghost" size="sm" onClick={() => actions.onManage(event.id)} className="flex-1">Manage</AdminButton>
                <AdminButton variant="ghost" size="sm" onClick={() => actions.onEdit(event)} className="flex-1">Edit</AdminButton>
                <AdminButton variant="danger" size="sm" onClick={() => actions.onDelete(event.id)} className="flex-1">Delete</AdminButton>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function EventsTab({ editId }: { editId?: string } = {}) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [linkingEvent, setLinkingEvent] = useState<string | null>(null)
  const [importingEvent, setImportingEvent] = useState<Event | null>(null)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadEvents = () => {
    setIsLoading(true)
    fetchEvents().then((r) => setEvents(r.data)).catch(() => {}).finally(() => setIsLoading(false))
  }

  useEffect(() => { loadEvents() }, [])

  // Auto-open edit modal when editId is provided via URL
  useEffect(() => {
    if (editId && events.length > 0 && !editingEvent) {
      const match = events.find((e) => e.id === editId)
      if (match) setEditingEvent(match)
    }
  }, [editId, events, editingEvent])

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.series || '').toLowerCase().includes(q) ||
      (e.location || '').toLowerCase().includes(q)
    )
  }, [events, search])

  const handleDelete = async (id: string) => {
    await deleteEventAdmin(id); setEvents((p) => p.filter((e) => e.id !== id)); setConfirmDelete(null)
  }

  if (isLoading) return <Skeleton height={256} />

  const actions: EventActions = {
    onImport: setImportingEvent,
    onManage: setLinkingEvent,
    onEdit: setEditingEvent,
    onDelete: setConfirmDelete,
  }

  return (
    <>
      <EventsToolbar
        count={filtered.length}
        search={search}
        onSearch={setSearch}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onCreate={() => setShowCreate(true)}
      />

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-muted">
          {search ? 'No events match your search.' : 'No events yet.'}
        </p>
      ) : viewMode === 'list' ? (
        <EventListTable events={filtered} refreshKey={refreshKey} actions={actions} />
      ) : (
        <EventGrid events={filtered} refreshKey={refreshKey} actions={actions} />
      )}

      {/* Create modal */}
      {showCreate && <EventFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); setRefreshKey((k) => k + 1); loadEvents() }} />}

      {/* Edit modal */}
      {editingEvent && <EventFormModal event={editingEvent} onClose={() => setEditingEvent(null)} onSaved={() => { setEditingEvent(null); setRefreshKey((k) => k + 1); loadEvents() }} />}

      {/* Delete confirm */}
      <AdminModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Event"
        size="sm"
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</AdminButton>
          </>
        }
      >
        <p className="text-[13px] text-text">This will delete the event. Sets will be unlinked but not deleted.</p>
      </AdminModal>

      {/* Link/unlink sets modal */}
      {linkingEvent && <LinkSetModal eventId={linkingEvent} onClose={() => setLinkingEvent(null)} onChanged={loadEvents} />}

      {/* Import sets from 1001TL modal */}
      {importingEvent && (
        <ImportSetsModal
          event={importingEvent}
          onClose={() => setImportingEvent(null)}
          onImported={() => { setImportingEvent(null); loadEvents() }}
        />
      )}
    </>
  )
}
