// D1 query helpers

/**
 * Extract the anonymous ID from request headers
 */
export function getAnonymousId(request: Request): string | null {
  return request.headers.get('X-Anonymous-Id')
}

/**
 * Paginated query helper
 */
export async function paginatedQuery<T>(
  db: D1Database,
  query: string,
  countQuery: string,
  params: unknown[],
  page: number,
  pageSize: number
) {
  const offset = (page - 1) * pageSize
  const queryParams = [...params, pageSize, offset]

  const [countResult, dataResult] = await db.batch([
    db.prepare(countQuery).bind(...params),
    db.prepare(query).bind(...queryParams),
  ])

  const total = (countResult.results[0] as { total: number }).total
  return {
    data: dataResult.results as T[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    ok: true as const,
  }
}
