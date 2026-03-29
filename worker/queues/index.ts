// Queue consumer handlers for ML pipeline + cover art + enrichment
import { runDetectionPipeline } from '../services/ml-detection'
import { processFeedbackBatch } from '../services/feedback-processor'
import { cacheSongCoverArt, enrichSongWithLastfm } from '../services/songs'

interface DetectionMessage {
  type: 'detect_tracks'
  set_id: string
  job_id: string
}

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

interface CoverArtMessage {
  type: 'cache_cover_art' | 'enrich_lastfm'
  song_id: string
  image_url?: string
  artist?: string
  title?: string
}

/**
 * Handle messages from the ml-detection-queue.
 * Uses the new v2 pipeline (YouTube + LLM + Last.fm).
 */
export async function handleDetectionQueue(
  batch: MessageBatch<DetectionMessage>,
  env: Env
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      const { set_id } = msg.body
      console.log(`[queue] Starting detection for set ${set_id}`)

      const result = await runDetectionPipeline(set_id, env)

      if (result.error) {
        console.error(`[queue] Detection failed for set ${set_id}: ${result.error}`)
        // Don't retry permanent failures
        if (result.error === 'Set not found') {
          msg.ack()
        } else {
          msg.retry({ delaySeconds: 60 })
        }
      } else {
        console.log(`[queue] Detection complete for set ${set_id}: ${result.detections} tracks`)
        msg.ack()
      }
    } catch (error) {
      console.error('[queue] Detection error:', error)
      msg.retry({ delaySeconds: 60 })
    }
  }
}

/**
 * Handle messages from the feedback-queue.
 */
export async function handleFeedbackQueue(
  batch: MessageBatch<FeedbackMessage>,
  env: Env
): Promise<void> {
  try {
    const messages = batch.messages.map((msg) => ({
      body: msg.body,
      id: msg.id,
    }))
    await processFeedbackBatch(messages, env)
    batch.ackAll()
  } catch (error) {
    console.error('Feedback queue error:', error)
    batch.retryAll({ delaySeconds: 60 })
  }
}

/**
 * Handle messages from the cover-art-queue.
 * Processes cover art downloads and Last.fm enrichment with natural rate limiting
 * via the queue's batch size and retry backoff.
 */
export async function handleCoverArtQueue(
  batch: MessageBatch<CoverArtMessage>,
  env: Env
): Promise<void> {
  const lastfmKey = env.LASTFM_API_KEY && env.LASTFM_API_KEY.length > 5 ? env.LASTFM_API_KEY : undefined

  for (const msg of batch.messages) {
    try {
      const { type, song_id } = msg.body

      if (type === 'cache_cover_art') {
        await cacheSongCoverArt(song_id, env, msg.body.image_url)
        console.log(`[queue] Cached cover art for song ${song_id}`)
      } else if (type === 'enrich_lastfm') {
        if (lastfmKey && msg.body.artist && msg.body.title) {
          await enrichSongWithLastfm(song_id, msg.body.artist, msg.body.title, env)
          console.log(`[queue] Enriched song ${song_id} with Last.fm`)
        }
      }

      msg.ack()
    } catch (err) {
      console.warn(`[queue] Cover art/enrichment failed for ${msg.body.song_id}:`, err instanceof Error ? err.message : String(err))
      msg.retry({ delaySeconds: 30 })
    }
  }
}
