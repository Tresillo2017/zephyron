/**
 * Convert UTC timestamp to Pacific time (PST/PDT)
 * @param utcTimestamp - ISO 8601 UTC timestamp (e.g., '2026-01-15T08:00:00Z')
 * @returns ISO 8601 timestamp in Pacific timezone with offset (e.g., '2026-01-15T00:00:00-08:00')
 */
export function utcToPacific(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);

  // Format using Pacific timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};

  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  const hour = partMap.hour;
  const minute = partMap.minute;
  const second = partMap.second;

  // Determine UTC offset for Pacific timezone
  // Get the UTC date/time and the Pacific date/time, then calculate the difference
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const utcParts = utcFormatter.formatToParts(date);
  const utcPartMap: Record<string, string> = {};
  for (const part of utcParts) {
    utcPartMap[part.type] = part.value;
  }

  // Calculate offset: Pacific time - UTC time (in hours)
  const pacificHour = parseInt(hour);
  const utcHour = parseInt(utcPartMap.hour);
  let offsetHours = pacificHour - utcHour;

  // Handle day boundary wrapping
  if (offsetHours > 12) {
    offsetHours -= 24;
  } else if (offsetHours < -12) {
    offsetHours += 24;
  }

  // Format offset as -08:00 or -07:00 (negative for west of UTC)
  const offsetStr = offsetHours <= 0 ? `-${String(Math.abs(offsetHours)).padStart(2, '0')}` : `+${String(offsetHours).padStart(2, '0')}`;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetStr}:00`;
}

/**
 * Extract session date in Pacific timezone
 * @param utcTimestamp - ISO 8601 UTC timestamp (e.g., '2026-01-15T08:00:00Z')
 * @returns Date in YYYY-MM-DD format (Pacific timezone)
 */
export function getSessionDate(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);

  // Format using Pacific timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};

  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;

  return `${year}-${month}-${day}`;
}
