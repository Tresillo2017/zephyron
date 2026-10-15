import { describe, it, expect } from 'vitest'
import { syncSet1001Tracklists } from '../routes/sets-1001-sync'
import { createArtist } from '../routes/artists'

// Minimal in-memory stand-in for D1: records every statement and answers the
// SELECTs the handlers issue from `rows`. Enough to test branching and SQL shape.
interface FakeRow { [key: string]: unknown }
interface Recorded { sql: string; args: unknown[] }

function fakeEnv(rows: Record<string, FakeRow | null>) {
  const executed: Recorded[] = []
  const lookup = (sql: string, args: unknown[]): FakeRow | null => {
    executed.push({ sql, args })
    if (sql.startsWith('SELECT id, stream_type')) return rows.set ?? null
    if (sql.includes('FROM artists WHERE source_1001_id')) return rows.artistBySource ?? null
    if (sql.includes('FROM artists WHERE name')) return rows.artistByName ?? null
    return null
  }
  const DB = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            sql, args,
            first: async <T>() => lookup(sql, args) as T | null,
            run: async () => ({ success: true }),
          }
        },
      }
    },
    batch: async (stmts: Array<{ sql: string; args: unknown[] }>) => {
      for (const s of stmts) executed.push({ sql: s.sql, args: s.args })
      return []
    },
  }
  return { env: { DB } as unknown as Env, executed }
}

const ctx = { waitUntil: () => {} } as unknown as ExecutionContext

function putRequest(body: unknown): Request {
  return new Request('https://x.test/api/admin/sets/s1/sync-1001tracklists', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('syncSet1001Tracklists', () => {
  it('returns 404 when the set does not exist', async () => {
    const { env } = fakeEnv({ set: null })
    const res = await syncSet1001Tracklists(putRequest({ title: 'T' }), env, ctx, { id: 's1' })
    expect(res.status).toBe(404)
  })

  it('updates metadata in place and never touches audio, plays or created_at', async () => {
    const { env, executed } = fakeEnv({
      set: { id: 's1', stream_type: 'invidious', youtube_video_id: 'abc', source_url: 'yt' },
    })
    const res = await syncSet1001Tracklists(
      putRequest({ title: 'New title', genre: 'Techno', duration_seconds: 3600.4 }),
      env, ctx, { id: 's1' },
    )
    expect(res.status).toBe(200)
    const update = executed.find(e => e.sql.startsWith('UPDATE sets SET'))!
    expect(update.sql).toContain('title = ?')
    expect(update.sql).toContain('genre = ?')
    expect(update.sql).toContain('duration_seconds = ?')
    expect(update.sql).not.toMatch(/r2_key|play_count|detection_status|created_at/)
    expect(update.args).toEqual(['New title', 'Techno', 3600, 's1'])
  })

  it('fills the stream source only while the set has none', async () => {
    const { env, executed } = fakeEnv({
      set: { id: 's1', stream_type: 'invidious', youtube_video_id: 'keep', source_url: 'keep' },
    })
    await syncSet1001Tracklists(putRequest({ title: 'T', youtube_video_id: 'new' }), env, ctx, { id: 's1' })
    const update = executed.find(e => e.sql.startsWith('UPDATE sets SET'))!
    expect(update.sql).not.toContain('stream_type = ?')
    expect(update.args).not.toContain('new')
  })

  it('fills the stream source when the set is awaiting one', async () => {
    const { env, executed } = fakeEnv({ set: { id: 's1', stream_type: null, youtube_video_id: null, source_url: null } })
    const res = await syncSet1001Tracklists(
      putRequest({ title: 'T', youtube_video_id: 'vid123456789' }), env, ctx, { id: 's1' },
    )
    const body = await res.json() as { data: { stream_filled: boolean } }
    expect(body.data.stream_filled).toBe(true)
    const update = executed.find(e => e.sql.startsWith('UPDATE sets SET'))!
    expect(update.args).toContain('invidious')
    expect(update.args).toContain('vid123456789')
  })

  it('never blanks the required title or artist columns', async () => {
    const { env, executed } = fakeEnv({ set: { id: 's1', stream_type: 'invidious' } })
    await syncSet1001Tracklists(putRequest({ title: '   ', genre: 'House' }), env, ctx, { id: 's1' })
    const update = executed.find(e => e.sql.startsWith('UPDATE sets SET'))!
    expect(update.sql).not.toContain('title = ?')
    expect(update.sql).toContain('genre = ?')
  })

  it('records the tracklist hash and sync time', async () => {
    const { env, executed } = fakeEnv({ set: { id: 's1', stream_type: 'invidious' } })
    await syncSet1001Tracklists(putRequest({ tracklist_1001_hash: 'h1' }), env, ctx, { id: 's1' })
    const update = executed.find(e => e.sql.startsWith('UPDATE sets SET'))!
    expect(update.sql).toContain('tracklist_1001_hash = ?')
    expect(update.sql).toContain('tracklist_1001_synced_at = CURRENT_TIMESTAMP')
  })
})

describe('createArtist idempotency', () => {
  it('returns 409 with the existing id when the 1001 source id already exists', async () => {
    const { env } = fakeEnv({ artistBySource: { id: 'a1', slug: 'tiesto' } })
    const req = new Request('https://x.test/api/admin/artists', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tiesto', source_1001_id: 'tiesto' }),
    })
    const res = await createArtist(req, env, ctx, {})
    expect(res.status).toBe(409)
    const body = await res.json() as { data: { id: string } }
    expect(body.data.id).toBe('a1')
  })

  it('returns 409 with the existing id on a name collision', async () => {
    const { env } = fakeEnv({ artistByName: { id: 'a2', slug: 'tiesto' } })
    const req = new Request('https://x.test/api/admin/artists', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tiesto' }),
    })
    const res = await createArtist(req, env, ctx, {})
    expect(res.status).toBe(409)
    expect(((await res.json()) as { data: { id: string } }).data.id).toBe('a2')
  })
})
