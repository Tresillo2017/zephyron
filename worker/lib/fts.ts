export function toFtsQuery(q: string): string {
  const trimmed = q.trim().replace(/["()*]/g, '')
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  return tokens.map(t => `${t}*`).join(' ')
}
