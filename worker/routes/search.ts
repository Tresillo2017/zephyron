import { json } from '../lib/router'
import type { DjSet } from '../types'

// GET /api/search?q=...&genre=...
export async function search(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()
  const genre = url.searchParams.get('genre')
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

  if (!q && !genre) {
    return json({ data: { sets: [], tracks: [], events: [] }, ok: true })
  }

  const conditions: string[] = []
  const params: unknown[] = []

  if (q) {
    conditions.push('(s.title LIKE ? OR s.artist LIKE ? OR s.event LIKE ? OR s.venue LIKE ?)')
    const pattern = `%${q}%`
    params.push(pattern, pattern, pattern, pattern)
  }

  if (genre) {
    conditions.push('s.genre = ?')
    params.push(genre)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Search sets
  const setsResult = await env.DB.prepare(
    `SELECT * FROM sets s ${whereClause} ORDER BY play_count DESC LIMIT ?`
  )
    .bind(...params, limit)
    .all()

  // If we have a text query, also search within track detections
  let trackResults: unknown[] = []
  if (q) {
    const trackPattern = `%${q}%`
    const trackData = await env.DB.prepare(
      `SELECT d.*, s.title as set_title, s.artist as set_artist
       FROM detections d
       JOIN sets s ON d.set_id = s.id
       WHERE d.track_title LIKE ? OR d.track_artist LIKE ?
       ORDER BY d.confidence DESC
       LIMIT ?`
    )
      .bind(trackPattern, trackPattern, limit)
      .all()
    trackResults = trackData.results
  }

  // Search events by name, series, location, or series+year combo
  let eventResults: unknown[] = []
  if (q) {
    const eventPattern = `%${q}%`

    // Try to detect "series year" pattern like "tomorrowland 2025"
    const yearMatch = q.match(/^(.+?)\s+(20\d{2})$/)

    let eventQuery: string
    let eventParams: unknown[]

    if (yearMatch) {
      // User typed something like "tomorrowland 2025" — search series+year
      const seriesPattern = `%${yearMatch[1].trim()}%`
      const yearNum = parseInt(yearMatch[2])
      eventQuery = `SELECT e.*,
        (SELECT COUNT(*) FROM sets s WHERE s.event_id = e.id) as set_count
        FROM events e
        WHERE (e.series LIKE ? AND e.year = ?) OR e.name LIKE ?
        ORDER BY e.year DESC NULLS LAST
        LIMIT ?`
      eventParams = [seriesPattern, yearNum, eventPattern, limit]
    } else {
      eventQuery = `SELECT e.*,
        (SELECT COUNT(*) FROM sets s WHERE s.event_id = e.id) as set_count
        FROM events e
        WHERE e.name LIKE ? OR e.series LIKE ? OR e.location LIKE ?
        ORDER BY e.year DESC NULLS LAST
        LIMIT ?`
      eventParams = [eventPattern, eventPattern, eventPattern, limit]
    }

    const eventData = await env.DB.prepare(eventQuery).bind(...eventParams).all()
    eventResults = eventData.results
  }

  return json({
    data: {
      sets: setsResult.results as unknown as DjSet[],
      tracks: trackResults,
      events: eventResults,
    },
    ok: true,
  })
}
