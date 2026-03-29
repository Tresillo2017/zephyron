// LLM-based metadata extraction from Invidious video data
// Uses Llama 3.2 3B to parse structured DJ set info from titles + descriptions

import type { InvidiousVideoData, InvidiousMusicTrack } from './invidious'

export interface ExtractedMetadata {
  dj_name: string
  title: string
  venue: string
  event: string
  genre: string
  subgenre: string
  recorded_date: string
  description: string
  has_tracklist: boolean
  llm_extracted: boolean
  /** Raw LLM response for debugging */
  _debug_response?: string
}

// Concise system prompt — shorter = more reliable output from small models
const SYSTEM_PROMPT = `You extract metadata from DJ set YouTube videos. Respond with ONLY a JSON object. No markdown. No explanation.`

function buildUserPrompt(video: InvidiousVideoData): string {
  // Truncate description to 2000 chars for the 3B model's context
  const desc = video.description
    ? video.description.slice(0, 2000)
    : '(no description available)'

  const durationMin = video.lengthSeconds > 0
    ? `${Math.round(video.lengthSeconds / 60)} minutes`
    : 'unknown'

  // Format publish date from Unix epoch
  const publishedDate = video.published
    ? new Date(video.published * 1000).toISOString().split('T')[0]
    : 'unknown'

  // Include musicTracks if available (free structured data from YouTube)
  const musicTracksInfo = video.musicTracks.length > 0
    ? `\n- Music Tracks (auto-detected): ${video.musicTracks.slice(0, 5).map((t: InvidiousMusicTrack) => `${t.artist} - ${t.song}`).join('; ')}`
    : ''

  // Separate instructions from data clearly, and keep the JSON template simple
  return `Analyze this DJ set video and return a JSON object.

VIDEO DATA:
- Title: ${video.title}
- Channel: ${video.author}
- Tags: ${video.keywords.length > 0 ? video.keywords.slice(0, 15).join(', ') : 'none'}
- Published: ${publishedDate}
- Duration: ${durationMin}
- Genre (from YouTube): ${video.genre || 'unknown'}${musicTracksInfo}
- Description: ${desc}

REQUIRED JSON FORMAT (fill every field, use "" for unknown):
{
  "dj_name": "performing DJ name",
  "title": "clean set title",
  "venue": "club or venue name",
  "event": "festival or event name",
  "genre": "Techno or House or Trance or Drum & Bass or Dubstep or Minimal or Progressive or Hardstyle or Disco or Electro or Ambient or Breaks or Downtempo or Garage or Acid or Industrial",
  "subgenre": "specific subgenre like Dark Techno or Melodic House",
  "recorded_date": "YYYY-MM-DD",
  "description": "one sentence describing this DJ set",
  "has_tracklist": false
}

Rules:
- dj_name: the actual DJ, not the channel name (unless the channel IS the DJ)
- title: remove "FULL SET", "HD", "4K", "Official" etc from the title
- genre: pick ONE from the list above based on the music style
- recorded_date: use publish date "${publishedDate}" if no specific date found
- has_tracklist: true if description contains timestamps like "00:00" or "0:00"
- description: write a short editorial description for a streaming platform

Return ONLY the JSON:`
}

/**
 * Extract structured metadata from Invidious video data using Llama 3.2 3B.
 */
export async function extractSetMetadata(
  video: InvidiousVideoData,
  env: Env
): Promise<ExtractedMetadata> {
  const publishedDate = video.published
    ? new Date(video.published * 1000).toISOString().split('T')[0]
    : ''

  const fallback: ExtractedMetadata = {
    dj_name: video.author,
    title: video.title,
    venue: '',
    event: '',
    genre: inferGenreFromKeywords(video.keywords),
    subgenre: '',
    recorded_date: publishedDate,
    description: '',
    has_tracklist: video.description ? /\d{1,2}:\d{2}/.test(video.description) : false,
    llm_extracted: false,
  }

  try {
    const result = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(video) },
      ],
    })

    const responseText = typeof result === 'object' && result !== null && 'response' in result
      ? String((result as { response: string }).response)
      : ''

    if (!responseText) {
      console.error('LLM returned empty response')
      return { ...fallback, _debug_response: '(empty)' }
    }

    // Extract JSON from response — try multiple strategies
    let parsed: Record<string, unknown> | null = null

    // Strategy 1: direct parse
    try {
      parsed = JSON.parse(responseText)
    } catch {
      // Strategy 2: find JSON object in response
      const jsonMatch = responseText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          // Strategy 3: fix common LLM JSON issues
          const fixed = jsonMatch[0]
            .replace(/,\s*}/g, '}')           // trailing commas
            .replace(/'/g, '"')                // single quotes
            .replace(/:\s*true\b/gi, ': true') // ensure lowercase booleans
            .replace(/:\s*false\b/gi, ': false')
          try {
            parsed = JSON.parse(fixed)
          } catch {
            console.error('Could not parse LLM JSON after fixes:', fixed.slice(0, 300))
          }
        }
      }
    }

    if (!parsed) {
      console.error('No parseable JSON in LLM response:', responseText.slice(0, 300))
      return { ...fallback, _debug_response: responseText.slice(0, 500) }
    }

    // Build result, keeping fallback values where LLM returned empty/null
    return {
      dj_name: sanitizeString(parsed.dj_name) || fallback.dj_name,
      title: sanitizeString(parsed.title) || fallback.title,
      venue: sanitizeString(parsed.venue),
      event: sanitizeString(parsed.event),
      genre: sanitizeString(parsed.genre) || fallback.genre,
      subgenre: sanitizeString(parsed.subgenre),
      recorded_date: sanitizeDate(parsed.recorded_date) || fallback.recorded_date,
      description: sanitizeString(parsed.description),
      has_tracklist: typeof parsed.has_tracklist === 'boolean' ? parsed.has_tracklist : fallback.has_tracklist,
      llm_extracted: true,
      _debug_response: responseText.slice(0, 500),
    }
  } catch (err) {
    console.error('LLM metadata extraction failed:', err)
    return { ...fallback, _debug_response: String(err) }
  }
}

/**
 * Simple genre inference from YouTube keywords as a fallback.
 */
function inferGenreFromKeywords(keywords: string[]): string {
  const tagStr = keywords.join(' ').toLowerCase()
  const genreMap: [string, string][] = [
    ['techno', 'Techno'],
    ['house', 'House'],
    ['trance', 'Trance'],
    ['drum and bass', 'Drum & Bass'],
    ['dnb', 'Drum & Bass'],
    ['d&b', 'Drum & Bass'],
    ['dubstep', 'Dubstep'],
    ['minimal', 'Minimal'],
    ['progressive', 'Progressive'],
    ['hardstyle', 'Hardstyle'],
    ['disco', 'Disco'],
    ['electro', 'Electro'],
    ['ambient', 'Ambient'],
    ['breaks', 'Breaks'],
    ['garage', 'Garage'],
    ['acid', 'Acid'],
    ['industrial', 'Industrial'],
    ['downtempo', 'Downtempo'],
  ]

  for (const [keyword, genre] of genreMap) {
    if (tagStr.includes(keyword)) return genre
  }
  return ''
}

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return ''
  // Remove the placeholder instructions that LLM might copy
  const cleaned = value.trim()
  if (cleaned === 'unknown' || cleaned === 'Unknown' || cleaned === 'N/A' || cleaned === 'n/a') return ''
  return cleaned.slice(0, 500)
}

function sanitizeDate(value: unknown): string {
  if (typeof value !== 'string') return ''
  const cleaned = value.trim()
  // Accept YYYY-MM-DD
  const match = cleaned.match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : ''
}
