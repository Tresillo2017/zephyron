import { Card, Table, THead, TBody, Tr, Th, Td } from '../bleh'
import { getArtistImageUrl } from '../../lib/api'
import { formatPlayCount, formatRelativeTime } from '../../lib/formatTime'
import { AdminBadge, AdminButton, cellMuted } from './adminUi'
import { formatSetCount, parseArtistTags, type Artist } from './artistTypes'

export interface ArtistViewProps {
  artists: Artist[]
  syncing: string | null
  onSync: (id: string) => void
  onEdit: (artist: Artist) => void
  onDelete: (id: string) => void
}

const TAG_LIMIT = 3

function ArtistImage({ artist, initialClassName }: { artist: Artist; initialClassName: string }) {
  if (!artist.id) return <span className={initialClassName}>{artist.name.charAt(0)}</span>
  return <img src={getArtistImageUrl(artist.id)} alt={artist.name} className="h-full w-full object-cover" />
}

function ArtistTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.slice(0, TAG_LIMIT).map((tag) => (
        <AdminBadge key={tag} variant="muted">{tag}</AdminBadge>
      ))}
    </div>
  )
}

function SyncButton({ artist, syncing, onSync, className }: { artist: Artist; syncing: string | null; onSync: (id: string) => void; className?: string }) {
  return (
    <AdminButton
      variant="ghost"
      size="sm"
      onClick={() => onSync(artist.id)}
      disabled={syncing === artist.id}
      className={className}
    >
      {syncing === artist.id ? 'Syncing…' : 'Sync'}
    </AdminButton>
  )
}

function ArtistListMeta({ artist }: { artist: Artist }) {
  return (
    <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${cellMuted}`}>
      {artist.listeners > 0 && <span>{formatPlayCount(artist.listeners)} listeners</span>}
      {artist.source_1001_id && <span className="font-mono text-[11px] text-accent-2">1001TL:{artist.source_1001_id}</span>}
      {artist.last_synced_at && <span className="font-mono text-[11px]">synced {formatRelativeTime(artist.last_synced_at)}</span>}
    </div>
  )
}

export function ArtistListTable({ artists, syncing, onSync, onEdit, onDelete }: ArtistViewProps) {
  return (
    <Table>
      <THead>
        <Tr>
          <Th>Artist</Th>
          <Th className="w-24 text-center">Sets</Th>
          <Th className="w-56 text-right"><span className="sr-only">Actions</span></Th>
        </Tr>
      </THead>
      <TBody>
        {artists.map((artist) => (
          <Tr key={artist.id}>
            <Td className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-b4/60">
                  <ArtistImage artist={artist} initialClassName="text-[13px] font-bold text-muted" />
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-heading">{artist.name}</span>
                    <ArtistTags tags={parseArtistTags(artist.tags)} />
                  </div>
                  <ArtistListMeta artist={artist} />
                </div>
              </div>
            </Td>
            <Td className="text-center text-[13px] tabular-nums text-text">{formatSetCount(artist.set_count)}</Td>
            <Td className="text-right">
              <div className="flex justify-end gap-1">
                <SyncButton artist={artist} syncing={syncing} onSync={onSync} />
                <AdminButton variant="ghost" size="sm" onClick={() => onEdit(artist)}>Edit</AdminButton>
                <AdminButton variant="danger" size="sm" onClick={() => onDelete(artist.id)}>Delete</AdminButton>
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  )
}

function ArtistGridCard({ artist, syncing, onSync, onEdit, onDelete }: ArtistViewProps & { artist: Artist }) {
  const tags = parseArtistTags(artist.tags)
  return (
    <Card padded={false} className="flex flex-col gap-3 p-4">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-b4/60">
        <ArtistImage artist={artist} initialClassName="text-[40px] font-bold text-muted" />
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-[14px] font-medium text-heading">{artist.name}</h3>
        {artist.bio_summary && (
          <p className="mt-1 line-clamp-2 text-[12px] text-muted">{artist.bio_summary}</p>
        )}
      </div>

      <ArtistTags tags={tags} />

      <div className={`flex flex-wrap items-center gap-x-2 ${cellMuted}`}>
        {artist.listeners > 0 && <span>{formatPlayCount(artist.listeners)} listeners</span>}
        {artist.playcount > 0 && <span>{formatPlayCount(artist.playcount)} plays</span>}
        <span className="font-mono">{formatSetCount(artist.set_count)}</span>
      </div>

      {(artist.source_1001_id || artist.last_synced_at) && (
        <div className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
          {artist.source_1001_id && <span className="text-accent-2">1001TL:{artist.source_1001_id}</span>}
          {artist.last_synced_at && <span>synced {formatRelativeTime(artist.last_synced_at)}</span>}
        </div>
      )}

      <div className="mt-auto flex gap-1.5">
        <SyncButton artist={artist} syncing={syncing} onSync={onSync} className="flex-1" />
        <AdminButton variant="ghost" size="sm" onClick={() => onEdit(artist)} className="flex-1">Edit</AdminButton>
        <AdminButton variant="danger" size="sm" onClick={() => onDelete(artist.id)} className="flex-1">Delete</AdminButton>
      </div>
    </Card>
  )
}

export function ArtistGrid(props: ArtistViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {props.artists.map((artist) => (
        <ArtistGridCard key={artist.id} {...props} artist={artist} />
      ))}
    </div>
  )
}
