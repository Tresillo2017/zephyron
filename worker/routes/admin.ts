// Admin routes for ML pipeline management
import { json, errorResponse } from '../lib/router'
import { runDetectionPipeline } from '../services/ml-detection'
import { searchVideos } from '../services/invidious'

// POST /api/admin/sets/:id/detect — Run ML detection synchronously
export async function triggerDetection(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Verify set exists
  const set = await env.DB.prepare(
    'SELECT id, detection_status FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; detection_status: string }>()

  if (!set) {
    return errorResponse('Set not found', 404)
  }

  // Allow re-triggering stuck processing sets (> 10 min)
  if (set.detection_status === 'processing') {
    return errorResponse('Detection already in progress', 409)
  }

  // Run pipeline synchronously
  console.log(`[admin] Running detection pipeline for set ${id}`)
  const result = await runDetectionPipeline(id, env)

  if (result.error) {
    return json({
      data: { status: 'failed', error: result.error, detections: 0 },
      ok: false,
    }, 500)
  }

  return json({
    data: {
      status: 'complete',
      detections: result.detections,
      artist_id: result.artist_id || null,
    },
    ok: true,
  })
}

// GET /api/admin/sets/:id/detect/status — Get detection job status
export async function getDetectionStatus(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const job = await env.DB.prepare(
    'SELECT * FROM detection_jobs WHERE set_id = ? ORDER BY created_at DESC LIMIT 1'
  )
    .bind(id)
    .first()

  if (!job) {
    return errorResponse('No detection jobs found', 404)
  }

  return json({ data: job, ok: true })
}

// GET /api/admin/jobs — List recent detection jobs
export async function listJobs(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT dj.*, s.title as set_title, s.artist as set_artist
     FROM detection_jobs dj
     JOIN sets s ON dj.set_id = s.id
     ORDER BY dj.created_at DESC
     LIMIT 50`
  ).all()

  return json({ data: result.results, ok: true })
}

// POST /api/admin/sets/:id/redetect-low — Re-run full detection pipeline
export async function redetectLowConfidence(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Run the full pipeline again (it clears old detections)
  const result = await runDetectionPipeline(id, env)

  if (result.error) {
    return json({ data: { status: 'failed', error: result.error }, ok: false }, 500)
  }

  return json({
    data: { status: 'complete', detections: result.detections },
    ok: true,
  })
}

// GET /api/admin/youtube-search?q=<query> — proxy Invidious video search
export async function youtubeSearch(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return errorResponse('q parameter required', 400)

  try {
    const results = await searchVideos(q, env)
    return json({ data: results, ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return errorResponse(message, 500)
  }
}
