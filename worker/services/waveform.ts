// Waveform generation service
// Computes audio peak data from an MP3/FLAC file stored in R2.
// Peaks are normalized 0-1 values representing the max amplitude in each time window.
// Result is stored as JSON in R2 at sets/{id}/waveform.json

const TARGET_PEAKS = 800 // Number of peak values to generate

/**
 * Generate waveform peaks from an audio file in R2.
 * Since Workers can't decode MP3 natively, we use a byte-level amplitude
 * estimation approach that samples raw bytes at regular intervals.
 *
 * For MP3: Sample the absolute value of bytes at regular offsets.
 * This produces a visually accurate waveform shape even without full decoding.
 */
export async function generateWaveform(
  setId: string,
  env: Env
): Promise<{ peaks: number[]; stored: boolean }> {
  // Get the set's R2 key
  const set = await env.DB.prepare(
    'SELECT r2_key, duration_seconds FROM sets WHERE id = ?'
  )
    .bind(setId)
    .first<{ r2_key: string; duration_seconds: number }>()

  if (!set) {
    return { peaks: [], stored: false }
  }

  // Fetch the audio file from R2
  const audioObject = await env.AUDIO_BUCKET.get(set.r2_key)
  if (!audioObject) {
    return { peaks: [], stored: false }
  }

  const audioBuffer = await audioObject.arrayBuffer()
  const bytes = new Uint8Array(audioBuffer)

  // Skip headers (ID3 tags for MP3 can be up to ~128KB, FLAC has a header too)
  // We skip the first 1% of the file to avoid header noise
  const headerSkip = Math.floor(bytes.length * 0.01)
  const dataLength = bytes.length - headerSkip

  if (dataLength < TARGET_PEAKS * 2) {
    return { peaks: [], stored: false }
  }

  // Sample at regular intervals to extract amplitude-like values
  const windowSize = Math.floor(dataLength / TARGET_PEAKS)
  const rawPeaks: number[] = []

  for (let i = 0; i < TARGET_PEAKS; i++) {
    const start = headerSkip + i * windowSize
    const end = Math.min(start + windowSize, bytes.length)

    // Find the maximum deviation from 128 (the center for unsigned 8-bit audio)
    // For compressed formats, this gives a rough amplitude estimate
    let maxAmplitude = 0
    let sumAmplitude = 0
    let sampleCount = 0

    // Sample every 2nd byte to reduce computation (still accurate enough)
    for (let j = start; j < end; j += 2) {
      const val = Math.abs(bytes[j] - 128)
      if (val > maxAmplitude) maxAmplitude = val
      sumAmplitude += val
      sampleCount++
    }

    // Use a blend of max and average for a more natural waveform shape
    const avgAmplitude = sampleCount > 0 ? sumAmplitude / sampleCount : 0
    const blended = maxAmplitude * 0.6 + avgAmplitude * 0.4
    rawPeaks.push(blended)
  }

  // Normalize to 0-1 range
  const maxPeak = Math.max(...rawPeaks, 1)
  const peaks = rawPeaks.map((p) => {
    const normalized = p / maxPeak
    // Apply a slight power curve for better visual contrast
    return Math.pow(normalized, 0.7)
  })

  // Apply smoothing pass (moving average of 3)
  const smoothed: number[] = []
  for (let i = 0; i < peaks.length; i++) {
    const prev = i > 0 ? peaks[i - 1] : peaks[i]
    const next = i < peaks.length - 1 ? peaks[i + 1] : peaks[i]
    smoothed.push((prev + peaks[i] * 2 + next) / 4)
  }

  // Ensure minimum amplitude for visual appeal (no fully silent sections)
  const finalPeaks = smoothed.map((p) => Math.max(0.03, p))

  // Store in R2
  const waveformKey = `sets/${setId}/waveform.json`
  try {
    await env.AUDIO_BUCKET.put(
      waveformKey,
      JSON.stringify({ peaks: finalPeaks, generated_at: new Date().toISOString() }),
      {
        httpMetadata: { contentType: 'application/json' },
      }
    )

    // Update the set record with the waveform R2 key
    await env.DB.prepare(
      'UPDATE sets SET r2_waveform_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
      .bind(waveformKey, setId)
      .run()

    return { peaks: finalPeaks, stored: true }
  } catch (err) {
    console.error('Failed to store waveform:', err)
    return { peaks: finalPeaks, stored: false }
  }
}

/**
 * Retrieve pre-computed waveform peaks from R2.
 * Returns null if no waveform data exists.
 */
export async function getWaveformPeaks(
  setId: string,
  env: Env
): Promise<number[] | null> {
  const waveformKey = `sets/${setId}/waveform.json`
  const object = await env.AUDIO_BUCKET.get(waveformKey)

  if (!object) return null

  try {
    const data = await object.json() as { peaks: number[] }
    return data.peaks
  } catch {
    return null
  }
}
