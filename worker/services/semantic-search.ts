// Semantic search via Vectorize + Workers AI embeddings
// Uses BGE-base-en-v1.5 to embed set metadata, then queries Vectorize for similar sets

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5' as const

/**
 * Generate a text representation of a set for embedding.
 */
function setToText(set: { title: string; artist: string; genre?: string | null; venue?: string | null; event?: string | null; description?: string | null }): string {
  const parts = [
    set.title,
    set.artist,
    set.genre,
    set.venue,
    set.event,
    set.description,
  ].filter(Boolean)
  return parts.join(' | ')
}

/**
 * Index a set's metadata in Vectorize.
 * Called after creating a set or updating its metadata.
 */
export async function indexSet(
  set: { id: string; title: string; artist: string; genre?: string | null; venue?: string | null; event?: string | null; description?: string | null },
  env: Env
): Promise<void> {
  const text = setToText(set)

  // Generate embedding via Workers AI
  const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
    text: [text],
  }) as { data?: number[][] }

  const embedding = embeddingResult.data?.[0]
  if (!embedding) {
    console.error('Failed to generate embedding for set', set.id)
    return
  }

  // Upsert into Vectorize
  await env.VECTORIZE.upsert([
    {
      id: set.id,
      values: embedding,
      metadata: {
        title: set.title,
        artist: set.artist,
        genre: set.genre || '',
      },
    },
  ])
}

/**
 * Index a track detection for "find sets containing this song" search.
 */
export async function indexDetection(
  detection: { id: string; set_id: string; track_title: string; track_artist?: string | null },
  env: Env
): Promise<void> {
  const text = `${detection.track_title}${detection.track_artist ? ` by ${detection.track_artist}` : ''}`

  const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
    text: [text],
  }) as { data?: number[][] }

  const embedding = embeddingResult.data?.[0]
  if (!embedding) return

  // Use a prefixed ID to distinguish from set vectors
  await env.VECTORIZE.upsert([
    {
      id: `track:${detection.id}`,
      values: embedding,
      metadata: {
        type: 'track',
        set_id: detection.set_id,
        track_title: detection.track_title,
        track_artist: detection.track_artist || '',
      },
    },
  ])
}

/**
 * Find similar sets using semantic search.
 */
export async function findSimilarSets(
  query: string,
  env: Env,
  limit = 10
): Promise<{ id: string; score: number; metadata: Record<string, string> }[]> {
  // Generate embedding for query
  const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
    text: [query],
  }) as { data?: number[][] }

  const embedding = embeddingResult.data?.[0]
  if (!embedding) return []

  // Query Vectorize
  const results = await env.VECTORIZE.query(embedding, {
    topK: limit,
    returnMetadata: 'all',
  })

  return results.matches.map((match: any) => ({
    id: match.id,
    score: match.score,
    metadata: (match.metadata || {}) as Record<string, string>,
  }))
}

/**
 * Find sets containing a specific track (semantic match).
 */
export async function findSetsByTrack(
  trackQuery: string,
  env: Env,
  limit = 10
): Promise<{ set_id: string; track_title: string; score: number }[]> {
  const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
    text: [trackQuery],
  }) as { data?: number[][] }

  const embedding = embeddingResult.data?.[0]
  if (!embedding) return []

  const results = await env.VECTORIZE.query(embedding, {
    topK: limit * 2,
    returnMetadata: 'all',
    filter: { type: 'track' },
  })

  return results.matches
    .filter((m: any) => (m.metadata as Record<string, string>)?.type === 'track')
    .slice(0, limit)
    .map((match: any) => {
      const meta = (match.metadata || {}) as Record<string, string>
      return {
        set_id: meta.set_id,
        track_title: meta.track_title,
        score: match.score,
      }
    })
}
