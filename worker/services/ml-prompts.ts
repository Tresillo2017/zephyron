// ML Prompt management - stores and retrieves evolving prompt templates
// Community corrections feed back into improved prompts over time

import { generateId } from '../lib/id'

const DEFAULT_SYSTEM_PROMPT = `You are an expert DJ set track identification system. You analyze audio transcriptions and contextual clues from DJ sets to identify individual songs being played.

Given a transcription or audio description from a segment of a DJ set, identify the song being played. Consider:
- Vocal lyrics, spoken words, or recognizable melodies described
- BPM and energy level changes that indicate track transitions
- DJ mixing techniques (beatmatching, EQing) that signal new tracks
- Genre-specific patterns (techno builds, house vocals, trance breakdowns)

Respond with ONLY valid JSON in this exact format:
{"tracks": [{"title": "Song Title", "artist": "Artist Name", "confidence": 0.85, "start_offset": 0}]}

If you cannot identify any track, respond with: {"tracks": []}
Do not include any text outside the JSON response.`

const DEFAULT_FEW_SHOT_EXAMPLES = [
  {
    role: 'user' as const,
    content: 'Audio segment from a techno set (BPM ~130). Transcription contains rhythmic percussion, deep bass, and a distinctive synth riff. The crowd cheers at 15 seconds suggesting a recognizable drop.',
  },
  {
    role: 'assistant' as const,
    content: '{"tracks": [{"title": "Acid Rain", "artist": "Truncate", "confidence": 0.72, "start_offset": 0}]}',
  },
  {
    role: 'user' as const,
    content: 'Audio segment from a house set. Clear female vocals singing "I go, where you go". Upbeat disco-influenced production with funky bassline.',
  },
  {
    role: 'assistant' as const,
    content: '{"tracks": [{"title": "I Go", "artist": "Peggy Gou", "confidence": 0.95, "start_offset": 0}]}',
  },
]

export interface PromptTemplate {
  systemPrompt: string
  fewShotExamples: { role: 'user' | 'assistant'; content: string }[]
  version: number
}

/**
 * Get the active prompt template for track identification.
 * Falls back to defaults if no custom prompt exists.
 */
export async function getActivePrompt(env: Env): Promise<PromptTemplate> {
  // Try to load active prompt from DB
  const activePrompt = await env.DB.prepare(
    "SELECT * FROM ml_prompts WHERE prompt_type = 'track_id' AND is_active = 1 ORDER BY version DESC LIMIT 1"
  ).first<{ prompt_text: string; version: number }>()

  if (activePrompt) {
    try {
      const parsed = JSON.parse(activePrompt.prompt_text)
      return {
        systemPrompt: parsed.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        fewShotExamples: parsed.fewShotExamples || DEFAULT_FEW_SHOT_EXAMPLES,
        version: activePrompt.version,
      }
    } catch {
      // Fall through to defaults
    }
  }

  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    fewShotExamples: DEFAULT_FEW_SHOT_EXAMPLES,
    version: 0,
  }
}

/**
 * Create a new prompt version incorporating community corrections.
 * This is called by the feedback processor when enough corrections accumulate.
 */
export async function evolvePrompt(env: Env): Promise<number> {
  // Get unprocessed corrections to build new few-shot examples
  const corrections = await env.DB.prepare(
    `SELECT mf.original_prediction, mf.corrected_value, mf.feedback_type, s.genre
     FROM ml_feedback mf
     JOIN sets s ON mf.set_id = s.id
     WHERE mf.processed = 0 AND mf.feedback_type IN ('corrected', 'confirmed')
     ORDER BY mf.created_at DESC
     LIMIT 20`
  ).all()

  if (corrections.results.length < 5) {
    return 0 // Not enough feedback yet
  }

  const currentPrompt = await getActivePrompt(env)

  // Build new few-shot examples from confirmed corrections
  const newExamples: { role: 'user' | 'assistant'; content: string }[] = [
    ...currentPrompt.fewShotExamples,
  ]

  for (const correction of corrections.results) {
    const c = correction as { original_prediction: string; corrected_value: string; feedback_type: string; genre: string }
    if (c.feedback_type === 'corrected' && c.original_prediction && c.corrected_value) {
      try {
        const original = JSON.parse(c.original_prediction)
        const corrected = JSON.parse(c.corrected_value)

        // Add the correction as a few-shot example
        newExamples.push({
          role: 'user',
          content: `Audio segment from a ${c.genre || 'electronic'} set. Previous AI analysis suggested "${original.title}" by "${original.artist}" but this was incorrect.`,
        })
        newExamples.push({
          role: 'assistant',
          content: JSON.stringify({
            tracks: [{
              title: corrected.title,
              artist: corrected.artist,
              confidence: 0.9,
              start_offset: 0,
            }],
          }),
        })
      } catch {
        continue
      }
    }
  }

  // Cap at 10 few-shot examples (most recent corrections weighted)
  const cappedExamples = newExamples.slice(-20) // 10 pairs = 20 messages

  const newVersion = currentPrompt.version + 1
  const promptText = JSON.stringify({
    systemPrompt: currentPrompt.systemPrompt,
    fewShotExamples: cappedExamples,
  })

  // Deactivate old prompts
  await env.DB.prepare(
    "UPDATE ml_prompts SET is_active = 0 WHERE prompt_type = 'track_id'"
  ).run()

  // Insert new prompt version
  await env.DB.prepare(
    'INSERT INTO ml_prompts (id, prompt_type, prompt_text, version, sample_count, is_active) VALUES (?, ?, ?, ?, ?, 1)'
  )
    .bind(generateId(), 'track_id', promptText, newVersion, corrections.results.length)
    .run()

  // Mark feedback as processed
  await env.DB.prepare(
    "UPDATE ml_feedback SET processed = 1 WHERE processed = 0 AND feedback_type IN ('corrected', 'confirmed')"
  ).run()

  return newVersion
}
