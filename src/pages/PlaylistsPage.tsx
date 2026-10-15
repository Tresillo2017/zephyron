import { useState, useEffect, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router'
import { PlaylistFilled, RightFilled } from '@mingcute/react/core-filled'
import { fetchPlaylists, createPlaylist as createPlaylistApi } from '../lib/api'
import { Button, ContentCard, EmptyState, Input, Section, Skeleton, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import { formatRelativeTime } from '../lib/formatTime'
import type { Playlist } from '../lib/types'
import './library.css'

const SKELETON_ROWS = 3
const MAX_STAGGER = 12
const STAGGER_MS = 30

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const loadPlaylists = () => {
    setIsLoading(true)
    fetchPlaylists()
      .then((res) => setPlaylists(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadPlaylists()
  }, [])

  const handleCreate = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!newTitle.trim() || isCreating) return
    setIsCreating(true)
    try {
      await createPlaylistApi(newTitle.trim(), newDescription.trim() || undefined)
      setNewTitle('')
      setNewDescription('')
      setShowCreate(false)
      loadPlaylists()
    } catch {
      // silent
    } finally {
      setIsCreating(false)
    }
  }

  let list
  if (isLoading) {
    list = (
      <div className="zl-body" role="status" aria-label="Loading playlists">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <Skeleton key={i} height={60} borderRadius="var(--card-radius)" />
        ))}
      </div>
    )
  } else if (playlists.length === 0) {
    list = (
      <EmptyState
        icon={<PlaylistFilled />}
        title="No playlists yet"
        description="Group sets into playlists to keep your favourite nights together."
        action={<Button appearance="primary" label="Create your first playlist" onClick={() => setShowCreate(true)} />}
      />
    )
  } else {
    list = (
      <nav className="zl-rows" aria-label="Your playlists">
        {playlists.map((pl, i) => (
          <Link
            key={pl.id}
            to={`/app/playlists/${pl.id}`}
            className="zl-row animate-item"
            style={{ '--delay': `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms` } as CSSProperties}
          >
            <span className="zl-row-thumb" aria-hidden="true"><PlaylistFilled /></span>
            <span className="zl-row-main">
              <span className="zl-row-title">{pl.title}</span>
              <span className="zl-row-sub">
                {pl.item_count ?? 0} {(pl.item_count ?? 0) === 1 ? 'set' : 'sets'}
                {' · '}
                {formatRelativeTime(pl.updated_at)}
              </span>
            </span>
            <span className="zl-tile-chev" aria-hidden="true"><RightFilled /></span>
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <PageFrame>
      <ContentCard
        toolbar={
          <Toolbar>
            <h1 className="zl-toolbar-title">Your playlists</h1>
            {!isLoading && playlists.length > 0 && (
              <span className="zl-toolbar-meta">{playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}</span>
            )}
            <div className="cc-toolbar-fill" />
            <div className="zl-toolbar-trail">
              <Button
                size="sm"
                appearance={showCreate ? 'default' : 'primary'}
                label={showCreate ? 'Cancel' : 'New playlist'}
                aria-expanded={showCreate}
                onClick={() => setShowCreate((v) => !v)}
              />
            </div>
          </Toolbar>
        }
        top={
          showCreate ? (
            <form className="zl-create zl-form" onSubmit={handleCreate}>
              <Input
                label="Playlist name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="My DJ Set Collection"
                autoFocus
              />
              <Input
                label="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="A collection of my favourite sets..."
              />
              <div className="zl-form-actions">
                <Button
                  appearance="primary"
                  htmlButtonType="submit"
                  label={isCreating ? 'Creating...' : 'Create playlist'}
                  disabled={!newTitle.trim() || isCreating}
                />
              </div>
            </form>
          ) : undefined
        }
        main={<Section>{list}</Section>}
      />
    </PageFrame>
  )
}
