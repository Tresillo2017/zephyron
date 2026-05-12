import { json } from '../lib/router'
import { toFtsQuery } from '../lib/fts'

interface TopResult {
  type: 'set' | 'artist' | 'event' | 'track'
  id: string
  title: string
  subtitle: string
  link: string
  image_r2_key: string | null
  tags: string[]
}

// GET /api/search?q=...
export async function search(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q')?.trim()

  if (!q) {
    return json({ data: { top_result: null, sets: [], artists: [], events: [], tracks: [] }, ok: true })
  }

  const ftsQ = toFtsQuery(q)

  // Guard: if the query consisted entirely of special chars (e.g. "()"), ftsQ is empty.
  // Passing an empty string to FTS MATCH throws a SQLite syntax error.
  if (!ftsQ) {
    return json({ data: { top_result: null, sets: [], artists: [], events: [], tracks: [] }, ok: true })
  }

  const [setsRows, artistsRows, eventsRows, tracksRows] = await Promise.all([
    env.DB.prepare(`
      SELECT s.id, s.title, s.artist, s.genre, s.duration_seconds,
             s.cover_image_r2_key, s.play_count, s.stream_type, s.youtube_video_id,
             s.r2_key, s.r2_waveform_key, s.detection_status, s.created_at, s.updated_at
      FROM sets_fts f JOIN sets s ON f.id = s.id
      WHERE sets_fts MATCH ? ORDER BY rank LIMIT 10
    `).bind(ftsQ).all(),
    env.DB.prepare(`
      SELECT a.id, a.name, a.image_url, a.tags,
             (SELECT COUNT(*) FROM set_artists sa WHERE sa.artist_id = a.id) as set_count
      FROM artists_fts f JOIN artists a ON f.id = a.id
      WHERE artists_fts MATCH ? ORDER BY rank LIMIT 10
    `).bind(ftsQ).all(),
    env.DB.prepare(`
      SELECT e.id, e.name, e.slug, e.series, e.location, e.year,
             e.cover_image_r2_key, e.start_date, e.end_date,
             (SELECT COUNT(*) FROM sets s WHERE s.event_id = e.id) as set_count
      FROM events_fts f JOIN events e ON f.id = e.id
      WHERE events_fts MATCH ? ORDER BY rank LIMIT 10
    `).bind(ftsQ).all(),
    env.DB.prepare(`
      SELECT d.id, d.set_id, d.track_title, d.track_artist,
             d.start_time_seconds, d.confidence, d.song_id,
             s.title as set_title, s.artist as set_artist,
             sg.cover_art_r2_key as song_cover_r2_key
      FROM tracks_fts f
        JOIN detections d ON f.id = d.id
        JOIN sets s ON d.set_id = s.id
        LEFT JOIN songs sg ON d.song_id = sg.id
      WHERE tracks_fts MATCH ? ORDER BY rank LIMIT 10
    `).bind(ftsQ).all(),
  ])

  const sets = setsRows.results as any[]
  const artists = artistsRows.results as any[]
  const events = eventsRows.results as any[]
  const tracks = tracksRows.results as any[]

  // Pick top_result: artists first (exact name match is strongest signal), then sets, events, tracks
  let top_result: TopResult | null = null

  if (artists.length > 0) {
    const a = artists[0]
    const tags: string[] = (() => { try { return JSON.parse(a.tags || '[]') } catch { return [] } })()
    top_result = {
      type: 'artist',
      id: a.id,
      title: a.name,
      subtitle: `${a.set_count} set${a.set_count !== 1 ? 's' : ''}`,
      link: `/app/artists/${a.id}`,
      image_r2_key: a.image_url ?? null,
      tags: tags.slice(0, 3),
    }
  } else if (sets.length > 0) {
    const s = sets[0]
    top_result = {
      type: 'set',
      id: s.id,
      title: s.title,
      subtitle: s.artist,
      link: `/app/sets/${s.id}`,
      image_r2_key: s.cover_image_r2_key ?? null,
      tags: s.genre ? [s.genre] : [],
    }
  } else if (events.length > 0) {
    const e = events[0]
    top_result = {
      type: 'event',
      id: e.id,
      title: e.name,
      subtitle: `${e.location ?? ''}${e.year ? ` · ${e.year}` : ''}`.trim().replace(/^· /, ''),
      link: `/app/events/${e.slug || e.id}`,
      image_r2_key: e.cover_image_r2_key ?? null,
      tags: e.series ? [e.series] : [],
    }
  } else if (tracks.length > 0) {
    const t = tracks[0]
    top_result = {
      type: 'track',
      id: t.id,
      title: t.track_title,
      subtitle: `in ${t.set_title} · ${t.set_artist}`,
      link: `/app/sets/${t.set_id}`,
      image_r2_key: null,
      tags: t.track_artist ? [t.track_artist] : [],
    }
  }

  return json({
    data: { top_result, sets, artists, events, tracks },
    ok: true,
  })
}
