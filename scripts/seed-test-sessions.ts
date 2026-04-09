// Script to seed test listening sessions for analytics testing
import { generateId } from '../worker/lib/id'

async function seedTestSessions(env: any) {
  const userId = 'test_user_1'
  const setId = 'test_set_1'

  // Create 30 days of sessions (past month)
  const today = new Date()

  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const sessionDate = date.toISOString().split('T')[0]

    const sessionId = generateId()
    const durationSeconds = Math.floor(Math.random() * 3600) + 1800 // 30-90 min

    await env.DB.prepare(
      `INSERT INTO listening_sessions
       (id, user_id, set_id, started_at, ended_at, duration_seconds, percentage_completed, qualifies, session_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sessionId,
      userId,
      setId,
      date.toISOString(),
      new Date(date.getTime() + durationSeconds * 1000).toISOString(),
      durationSeconds,
      (durationSeconds / 3600) * 100,
      durationSeconds >= 540 ? 1 : 0,
      sessionDate
    ).run()
  }

  console.log('Created 30 test sessions')
}

// Run: wrangler d1 execute zephyron-db --file=scripts/seed-test-sessions.ts
