/**
 * Stats aggregation utilities for listening analytics
 * Calculate top artists, genres, discoveries, streaks, and longest sets
 */

/**
 * Calculate top artists by total listening duration
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate stats for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @param limit - Maximum number of artists to return
 * @returns Array of artist names sorted by total duration (DESC)
 */
export async function calculateTopArtists(
  env: any,
  userId: string,
  startDate: string,
  endDate: string,
  limit: number
): Promise<string[]> {
  const query = `
    SELECT
      d.track_artist,
      SUM(ls.duration_seconds) as total_duration
    FROM listening_sessions ls
    JOIN sets s ON ls.set_id = s.id
    JOIN detections d ON s.id = d.set_id
    WHERE ls.user_id = ?
      AND ls.session_date >= ?
      AND ls.session_date < ?
      AND d.track_artist IS NOT NULL
    GROUP BY d.track_artist
    ORDER BY total_duration DESC
    LIMIT ?
  `;

  try {
    const result = await env.DB.prepare(query).bind(userId, startDate, endDate, limit).all();
    return result.results.map((row: any) => row.track_artist);
  } catch (error) {
    console.error('Error calculating top artists:', error);
    return [];
  }
}

/**
 * Calculate the most listened genre in a time window
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate stats for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @returns Top genre name or null if no data
 */
export async function calculateTopGenre(
  env: any,
  userId: string,
  startDate: string,
  endDate: string
): Promise<string | null> {
  const query = `
    SELECT
      s.genre,
      COUNT(*) as play_count
    FROM listening_sessions ls
    JOIN sets s ON ls.set_id = s.id
    WHERE ls.user_id = ?
      AND ls.session_date >= ?
      AND ls.session_date < ?
      AND s.genre IS NOT NULL
    GROUP BY s.genre
    ORDER BY play_count DESC
    LIMIT 1
  `;

  try {
    const result = await env.DB.prepare(query).bind(userId, startDate, endDate).first();
    return result?.genre ?? null;
  } catch (error) {
    console.error('Error calculating top genre:', error);
    return null;
  }
}

/**
 * Calculate count of new (discovered) artists in a time window
 * Excludes artists that appeared in sessions before the start date
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate stats for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @returns Count of new artists discovered
 */
export async function calculateDiscoveries(
  env: any,
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const query = `
    SELECT COUNT(DISTINCT d.track_artist) as discovery_count
    FROM listening_sessions ls
    JOIN sets s ON ls.set_id = s.id
    JOIN detections d ON s.id = d.set_id
    WHERE ls.user_id = ?
      AND ls.session_date >= ?
      AND ls.session_date < ?
      AND d.track_artist IS NOT NULL
      AND d.track_artist NOT IN (
        SELECT DISTINCT d2.track_artist
        FROM listening_sessions ls2
        JOIN sets s2 ON ls2.set_id = s2.id
        JOIN detections d2 ON s2.id = d2.set_id
        WHERE ls2.user_id = ?
          AND ls2.session_date < ?
          AND d2.track_artist IS NOT NULL
      )
  `;

  try {
    const result = await env.DB.prepare(query)
      .bind(userId, startDate, endDate, userId, startDate)
      .first();
    return result?.discovery_count ?? 0;
  } catch (error) {
    console.error('Error calculating discoveries:', error);
    return 0;
  }
}

/**
 * Calculate the longest consecutive day streak
 * Pure function - no database query needed
 * @param dates - Sorted array of YYYY-MM-DD dates
 * @returns Length of longest consecutive day sequence
 */
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) {
    return 0;
  }

  if (dates.length === 1) {
    return 1;
  }

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const currentDate = new Date(dates[i]);
    const previousDate = new Date(dates[i - 1]);

    // Check if dates are consecutive (difference of 1 day)
    const daysDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }

  // Don't forget to check the last streak
  longestStreak = Math.max(longestStreak, currentStreak);

  return longestStreak;
}

/**
 * Calculate the set with the most listening time in a time window
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate stats for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @returns Set ID of the longest set or null if no data
 */
export async function calculateLongestSet(
  env: any,
  userId: string,
  startDate: string,
  endDate: string
): Promise<string | null> {
  const query = `
    SELECT
      ls.set_id,
      SUM(ls.duration_seconds) as total_duration
    FROM listening_sessions ls
    WHERE ls.user_id = ?
      AND ls.session_date >= ?
      AND ls.session_date < ?
    GROUP BY ls.set_id
    ORDER BY total_duration DESC
    LIMIT 1
  `;

  try {
    const result = await env.DB.prepare(query)
      .bind(userId, startDate, endDate)
      .first();
    return result?.set_id ?? null;
  } catch (error) {
    console.error('Error calculating longest set:', error);
    return null;
  }
}
