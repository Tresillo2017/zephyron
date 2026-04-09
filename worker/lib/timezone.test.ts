import { describe, it, expect } from 'vitest';
import { utcToPacific, getSessionDate } from './timezone';

describe('timezone utilities', () => {
  describe('utcToPacific', () => {
    it('converts UTC to Pacific (PST)', () => {
      // 2026-01-15 08:00 UTC = 2026-01-15 00:00 PST
      const result = utcToPacific('2026-01-15T08:00:00Z');
      expect(result).toBe('2026-01-15T00:00:00-08:00');
    });

    it('converts UTC to Pacific (PDT)', () => {
      // 2026-06-15 07:00 UTC = 2026-06-15 00:00 PDT
      const result = utcToPacific('2026-06-15T07:00:00Z');
      expect(result).toBe('2026-06-15T00:00:00-07:00');
    });
  });

  describe('getSessionDate', () => {
    it('extracts session date crossing midnight (before PST midnight)', () => {
      // 2026-01-15 07:59 UTC = 2026-01-14 23:59 PST
      const result = getSessionDate('2026-01-15T07:59:00Z');
      expect(result).toBe('2026-01-14');
    });

    it('extracts session date at PST midnight boundary', () => {
      // 2026-01-15 08:00 UTC = 2026-01-15 00:00 PST
      const result = getSessionDate('2026-01-15T08:00:00Z');
      expect(result).toBe('2026-01-15');
    });
  });
});
