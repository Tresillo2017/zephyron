// Semantic search routes
import { json, errorResponse } from '../lib/router'
import { findSimilarSets, findSetsByTrack, indexSet } from '../services/semantic-search'
import type { DjSet } from '../types'

// GET /api/search/similar/:id — Find similar sets to a given set
export async function searchSimilarSets(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Get the set's metadata for the query
  const set = await env.DB.prepare(
    'SELECT id, title, artist, genre, venue, event, description FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; title: string; artist: string; genre: string | null; venue: string | null; event: string | null; description: string | null }>()

  if (!set) return errorResponse('Set not found', 404)

  const queryText = [set.title, set.artist, set.genre, set.venue].filter(Boolean).join(' ')
  const results = await findSimilarSets(queryText, env, 6)

  // Filter out the source set and fetch full records
  const similarIds = results
    .filter((r) => r.id !== id)
    .slice(0, 5)
    .map((r) => r.id)

  if (similarIds.length === 0) {
    return json({ data: [], ok: true })
  }

  const placeholders = similarIds.map(() => '?').join(',')
  const sets = await env.DB.prepare(
    `SELECT * FROM sets WHERE id IN (${placeholders})`
  )
    .bind(...similarIds)
    .all()

  return json({ data: sets.results as unknown as DjSet[], ok: true })
}

// GET /api/search/by-track?q=... — Find sets containing a track
export async function searchByTrack(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()
  if (!q) return json({ data: [], ok: true })

  const results = await findSetsByTrack(q, env, 10)

  if (results.length === 0) {
    return json({ data: [], ok: true })
  }

  // Fetch the set details
  const setIds = [...new Set(results.map((r) => r.set_id))]
  const placeholders = setIds.map(() => '?').join(',')
  const sets = await env.DB.prepare(
    `SELECT * FROM sets WHERE id IN (${placeholders})`
  )
    .bind(...setIds)
    .all()

  return json({
    data: {
      tracks: results,
      sets: sets.results as unknown as DjSet[],
    },
    ok: true,
  })
}

// POST /api/admin/sets/:id/index — Index a set in Vectorize
export async function indexSetRoute(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT id, title, artist, genre, venue, event, description FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; title: string; artist: string; genre: string | null; venue: string | null; event: string | null; description: string | null }>()

  if (!set) return errorResponse('Set not found', 404)

  await indexSet(set, env)
  return json({ ok: true })
}
