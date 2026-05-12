import { describe, it, expect } from 'vitest'
import { toFtsQuery } from '../lib/fts'

describe('toFtsQuery', () => {
  it('appends * for single word', () => {
    expect(toFtsQuery('techno')).toBe('techno*')
  })

  it('tokenises multi-word as prefix terms', () => {
    expect(toFtsQuery('john summit')).toBe('john* summit*')
  })

  it('trims whitespace', () => {
    expect(toFtsQuery('  bicep  ')).toBe('bicep*')
  })

  it('strips FTS5 special chars', () => {
    expect(toFtsQuery('b2b (remix)')).toBe('b2b* remix*')
    expect(toFtsQuery('"quoted"')).toBe('quoted*')
    expect(toFtsQuery('test*')).toBe('test*')
  })

  it('handles single word after stripping special chars', () => {
    expect(toFtsQuery('(techno)')).toBe('techno*')
  })
})
