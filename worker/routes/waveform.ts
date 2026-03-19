// Waveform API routes
import { json, errorResponse } from '../lib/router'
import { generateWaveform, getWaveformPeaks } from '../services/waveform'

// GET /api/sets/:id/waveform — Get waveform peaks (from R2 or generate on-demand)
export async function getSetWaveform(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Try to load pre-computed waveform from R2
  const cached = await getWaveformPeaks(id, env)
  if (cached) {
    return json({ data: { peaks: cached, source: 'cached' }, ok: true })
  }

  // Generate on-demand (and store for next time)
  // Run in background so response doesn't block
  const result = await generateWaveform(id, env)

  if (result.peaks.length === 0) {
    return errorResponse('Could not generate waveform', 404)
  }

  return json({ data: { peaks: result.peaks, source: 'generated' }, ok: true })
}

// POST /api/admin/sets/:id/waveform — Force regenerate waveform
export async function regenerateWaveform(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const result = await generateWaveform(id, env)

  if (result.peaks.length === 0) {
    return errorResponse('Could not generate waveform. Is the audio file uploaded?', 400)
  }

  return json({
    data: { peaks_count: result.peaks.length, stored: result.stored },
    ok: true,
  })
}
