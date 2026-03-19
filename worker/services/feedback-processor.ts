// Feedback Processing Service
// Processes community corrections and feeds them back into the ML system
// Handles: confirmed detections, corrected tracks, false positives, missed tracks

import { generateId } from '../lib/id'
import { evolvePrompt } from './ml-prompts'

interface FeedbackMessage {
  type: 'annotation_created'
  annotation_id: string
  set_id: string
  detection_id: string | null
  annotation_type: 'correction' | 'new_track' | 'delete'
  track_title: string
  track_artist: string | null
  start_time_seconds: number
}

/**
 * Process a batch of feedback messages from the feedback queue.
 */
export async function processFeedbackBatch(
  messages: { body: FeedbackMessage; id: string }[],
  env: Env
): Promise<void> {
  for (const msg of messages) {
    try {
      await processSingleFeedback(msg.body, env)
    } catch (error) {
      console.error(`Failed to process feedback ${msg.id}:`, error)
    }
  }

  // Check if we have enough feedback to evolve the prompt
  const unprocessedCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM ml_feedback WHERE processed = 0'
  ).first<{ count: number }>()

  if (unprocessedCount && unprocessedCount.count >= 10) {
    try {
      const newVersion = await evolvePrompt(env)
      if (newVersion > 0) {
        console.log(`Prompt evolved to version ${newVersion}`)
      }
    } catch (error) {
      console.error('Failed to evolve prompt:', error)
    }
  }
}

async function processSingleFeedback(
  feedback: FeedbackMessage,
  env: Env
): Promise<void> {
  let feedbackType: string
  let originalPrediction: string | null = null
  let correctedValue: string | null = null

  if (feedback.detection_id) {
    // Get the original detection
    const detection = await env.DB.prepare(
      'SELECT track_title, track_artist, confidence FROM detections WHERE id = ?'
    )
      .bind(feedback.detection_id)
      .first<{ track_title: string; track_artist: string | null; confidence: number }>()

    if (detection) {
      originalPrediction = JSON.stringify({
        title: detection.track_title,
        artist: detection.track_artist,
        confidence: detection.confidence,
      })
    }
  }

  switch (feedback.annotation_type) {
    case 'correction':
      feedbackType = 'corrected'
      correctedValue = JSON.stringify({
        title: feedback.track_title,
        artist: feedback.track_artist,
      })
      break
    case 'new_track':
      feedbackType = 'missed_track'
      correctedValue = JSON.stringify({
        title: feedback.track_title,
        artist: feedback.track_artist,
        start_time: feedback.start_time_seconds,
      })
      break
    case 'delete':
      feedbackType = 'false_positive'
      break
    default:
      return
  }

  // Store the feedback
  await env.DB.prepare(
    `INSERT INTO ml_feedback (id, set_id, detection_id, feedback_type, original_prediction, corrected_value)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      generateId(),
      feedback.set_id,
      feedback.detection_id || null,
      feedbackType,
      originalPrediction,
      correctedValue
    )
    .run()

  // If this is a high-confidence correction (from annotation approval),
  // also apply it directly to the detection
  if (feedback.annotation_type === 'correction' && feedback.detection_id) {
    // Check if the annotation has many upvotes (community consensus)
    const annotation = await env.DB.prepare(
      'SELECT id FROM annotations WHERE id = ? AND status = ?'
    )
      .bind(feedback.annotation_id, 'approved')
      .first()

    if (annotation) {
      // Direct correction of the detection
      await env.DB.prepare(
        `UPDATE detections SET track_title = ?, track_artist = ?, detection_method = 'community', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )
        .bind(feedback.track_title, feedback.track_artist || null, feedback.detection_id)
        .run()
    }
  }
}

/**
 * Calculate ML accuracy statistics from community feedback.
 */
export async function getMLStats(env: Env): Promise<{
  totalDetections: number
  confirmedCorrect: number
  corrected: number
  falsePositives: number
  missedTracks: number
  accuracyRate: number
  promptVersion: number
  feedbackPending: number
}> {
  const [detectionCount, feedbackStats, promptInfo, pendingCount] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) as count FROM detections'),
    env.DB.prepare(
      `SELECT feedback_type, COUNT(*) as count FROM ml_feedback GROUP BY feedback_type`
    ),
    env.DB.prepare(
      "SELECT version FROM ml_prompts WHERE prompt_type = 'track_id' AND is_active = 1 ORDER BY version DESC LIMIT 1"
    ),
    env.DB.prepare('SELECT COUNT(*) as count FROM ml_feedback WHERE processed = 0'),
  ])

  const totalDetections = (detectionCount.results[0] as { count: number })?.count || 0

  const stats: Record<string, number> = {}
  for (const row of feedbackStats.results) {
    const r = row as { feedback_type: string; count: number }
    stats[r.feedback_type] = r.count
  }

  const confirmed = stats['confirmed'] || 0
  const corrected = stats['corrected'] || 0
  const falsePositives = stats['false_positive'] || 0
  const missedTracks = stats['missed_track'] || 0
  const totalFeedback = confirmed + corrected + falsePositives
  const accuracyRate = totalFeedback > 0 ? confirmed / totalFeedback : 0

  return {
    totalDetections,
    confirmedCorrect: confirmed,
    corrected,
    falsePositives,
    missedTracks,
    accuracyRate: Math.round(accuracyRate * 100) / 100,
    promptVersion: (promptInfo.results[0] as { version: number })?.version || 0,
    feedbackPending: (pendingCount.results[0] as { count: number })?.count || 0,
  }
}
