export function toFtsQuery(q: string): string {
  const trimmed = q.trim().replace(/["()*]/g, '')
  return trimmed.includes(' ') ? `"${trimmed}"*` : `${trimmed}*`
}
