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
  env: Env,
  userId: string,
  startDate: string,
  endDate: string,
  limit: number
): Promise<string[]> {
  const query = `
    SELECT
      d.track_artist,
      SUM(ls.duration_seconds / track_count.count) as total_duration
    FROM listening_sessions ls
    JOIN sets s ON ls.set_id = s.id
    JOIN detections d ON s.id = d.set_id
    JOIN (
      SELECT set_id, COUNT(*) as count
      FROM detections
      GROUP BY set_id
    ) track_count ON s.id = track_count.set_id
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
  env: Env,
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
  env: Env,
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
  env: Env,
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

/**
 * Calculate listening heatmap: 7x24 grid (day x hour) with session counts
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate heatmap for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @returns 7x24 array where heatmap[dayOfWeek][hour] = session count
 */
export async function calculateHeatmap(
  env: Env,
  userId: string,
  startDate: string,
  endDate: string
): Promise<number[][]> {
  // Initialize 7x24 grid with zeros
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  const query = `
    SELECT
      CAST(strftime('%w', started_at) AS INTEGER) as day_of_week,
      CAST(strftime('%H', started_at) AS INTEGER) as hour,
      COUNT(*) as count
    FROM listening_sessions
    WHERE user_id = ?
      AND session_date >= ?
      AND session_date < ?
    GROUP BY day_of_week, hour
  `;

  try {
    const result = await env.DB.prepare(query).bind(userId, startDate, endDate).all();

    for (const row of result.results as any[]) {
      heatmap[row.day_of_week][row.hour] = row.count;
    }

    return heatmap;
  } catch (error) {
    console.error('Error calculating heatmap:', error);
    return heatmap; // Return zero-filled grid on error
  }
}

/**
 * Calculate listening hours breakdown by day of week (Mon-Sun)
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate pattern for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @returns Array of 7 objects with day abbreviation and hours
 */
export async function calculateWeekdayPattern(
  env: Env,
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ day: string; hours: number }[]> {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize with zeros
  const pattern = dayNames.map(day => ({ day, hours: 0 }));

  const query = `
    SELECT
      CASE CAST(strftime('%w', started_at) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as day_name,
      SUM(duration_seconds) as total_seconds
    FROM listening_sessions
    WHERE user_id = ?
      AND session_date >= ?
      AND session_date < ?
    GROUP BY strftime('%w', started_at)
  `;

  try {
    const result = await env.DB.prepare(query).bind(userId, startDate, endDate).all();

    const dayMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    for (const row of result.results as any[]) {
      const dayIndex = dayMap[row.day_name];
      pattern[dayIndex].hours = Math.round((row.total_seconds / 3600) * 10) / 10;
    }

    return pattern;
  } catch (error) {
    console.error('Error calculating weekday pattern:', error);
    return pattern; // Return zero-filled pattern on error
  }
}
