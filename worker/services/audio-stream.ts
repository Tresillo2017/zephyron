// Audio streaming from R2 with Range request support

export async function streamAudio(
  request: Request,
  r2Key: string,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  console.log(`[stream] Key: ${r2Key}`)

  const rangeHeader = request.headers.get('Range')

  // Get the object (with or without range)
  if (rangeHeader) {
    return handleRangeRequest(r2Key, rangeHeader, env)
  }

  // Full file request
  const object = await env.AUDIO_BUCKET.get(r2Key)
  if (!object) {
    console.error(`[stream] NOT FOUND in R2: ${r2Key}`)
    return new Response('Audio not found', { status: 404 })
  }

  console.log(`[stream] Found, size=${object.size}, type=${object.httpMetadata?.contentType}`)

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg')
  headers.set('Content-Length', object.size.toString())
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')

  return new Response(object.body, { status: 200, headers })
}

async function handleRangeRequest(
  r2Key: string,
  rangeHeader: string,
  env: Env
): Promise<Response> {
  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)
  if (!match) {
    return new Response('Invalid Range', { status: 416 })
  }

  // Get full object info first
  const head = await env.AUDIO_BUCKET.head(r2Key)
  if (!head) {
    console.error(`[stream] HEAD not found: ${r2Key}`)
    return new Response('Audio not found', { status: 404 })
  }

  const totalSize = head.size
  const rangeStart = match[1] ? parseInt(match[1]) : undefined
  const rangeEnd = match[2] ? parseInt(match[2]) : undefined

  let offset: number
  let length: number

  if (rangeStart !== undefined && rangeEnd !== undefined) {
    offset = rangeStart
    length = rangeEnd - rangeStart + 1
  } else if (rangeStart !== undefined) {
    offset = rangeStart
    length = totalSize - rangeStart
  } else if (rangeEnd !== undefined) {
    offset = totalSize - rangeEnd
    length = rangeEnd
  } else {
    return new Response('Invalid Range', { status: 416 })
  }

  if (offset >= totalSize) {
    return new Response('Range Not Satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${totalSize}` },
    })
  }
  length = Math.min(length, totalSize - offset)

  console.log(`[stream] Range: ${offset}-${offset + length - 1}/${totalSize}`)

  const object = await env.AUDIO_BUCKET.get(r2Key, {
    range: { offset, length },
  })

  if (!object || !object.body) {
    console.error(`[stream] Range GET failed: ${r2Key}`)
    return new Response('Audio not found', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg')
  headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${totalSize}`)
  headers.set('Content-Length', length.toString())
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')

  return new Response(object.body, { status: 206, headers })
}
