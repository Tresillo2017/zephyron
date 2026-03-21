// Set request petition API — creates GitHub Issues with Turnstile verification
import { json, errorResponse } from '../lib/router'

const GITHUB_REPO = 'Tresillo2017/zephyron'
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function submitSetRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  let body: {
    name: string
    artist: string
    youtube_url: string
    event?: string
    genre?: string
    notes?: string
    turnstile_token: string
  }

  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  // Validate required fields
  if (!body.name?.trim()) return errorResponse('Set name is required', 400)
  if (!body.artist?.trim()) return errorResponse('DJ/Artist name is required', 400)
  if (!body.youtube_url?.trim()) return errorResponse('YouTube URL is required', 400)
  if (!body.turnstile_token?.trim()) return errorResponse('Turnstile verification is required', 400)

  // Validate YouTube URL format
  const ytRegex = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|live\/|shorts\/)|youtu\.be\/)/
  if (!ytRegex.test(body.youtube_url.trim())) {
    return errorResponse('Please provide a valid YouTube URL', 400)
  }

  // Verify Turnstile token
  const turnstileSecret = (env as any).TURNSTILE_SECRET_KEY
  if (turnstileSecret) {
    try {
      const formData = new FormData()
      formData.append('secret', turnstileSecret)
      formData.append('response', body.turnstile_token)
      formData.append('remoteip', request.headers.get('CF-Connecting-IP') || '')

      const turnstileResp = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body: formData,
      })

      const turnstileResult = await turnstileResp.json() as { success: boolean }
      if (!turnstileResult.success) {
        return errorResponse('Turnstile verification failed. Please try again.', 403)
      }
    } catch (err) {
      console.error('[petition] Turnstile verification error:', err)
      return errorResponse('Verification service unavailable', 503)
    }
  }

  // Build the GitHub issue body
  const issueTitle = `[Set Request] ${body.artist.trim()} — ${body.name.trim()}`
  const issueBody = `## Set Request

| Field | Value |
|-------|-------|
| **Set Name** | ${body.name.trim()} |
| **DJ / Artist** | ${body.artist.trim()} |
| **YouTube URL** | ${body.youtube_url.trim()} |
${body.event ? `| **Event / Venue** | ${body.event.trim()} |\n` : ''}${body.genre ? `| **Genre** | ${body.genre.trim()} |\n` : ''}
${body.notes ? `### Additional Notes\n\n${body.notes.trim()}\n` : ''}
---
*Submitted via Zephyron set request form*`

  // Create GitHub issue
  const githubToken = (env as any).GITHUB_TOKEN
  if (!githubToken) {
    console.error('[petition] GITHUB_TOKEN not configured')
    return errorResponse('Set request service is not configured. Please try again later.', 503)
  }

  try {
    const ghResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Zephyron-Worker',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ['set-request'],
      }),
    })

    if (!ghResp.ok) {
      const ghError = await ghResp.text()
      console.error(`[petition] GitHub API error ${ghResp.status}:`, ghError)
      return errorResponse('Failed to submit request. Please try again.', 502)
    }

    const ghData = await ghResp.json() as { html_url: string; number: number }
    return json({ data: { issue_url: ghData.html_url, issue_number: ghData.number }, ok: true }, 201)
  } catch (err) {
    console.error('[petition] GitHub API request failed:', err)
    return errorResponse('Failed to submit request. Please try again.', 502)
  }
}
