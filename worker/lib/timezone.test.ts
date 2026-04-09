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

    it('handles DST spring forward transition (2026-03-08)', () => {
      // March 8, 2026 at 2:00 AM PST clocks spring forward to 3:00 AM PDT
      // Transition occurs at 10:00 UTC (2:00 AM PST becomes 3:00 AM PDT)
      // 2026-03-08 10:00:00 UTC = 2026-03-08 03:00:00 PDT
      const result = utcToPacific('2026-03-08T10:00:00Z');
      expect(result).toBe('2026-03-08T03:00:00-07:00');
    });

    it('handles DST fall back transition (2026-11-01)', () => {
      // November 1, 2026 at 2:00 AM PDT clocks fall back to 1:00 AM PST
      // Transition occurs at 09:00 UTC (2:00 AM PDT becomes 1:00 AM PST)
      // 2026-11-01 08:00:00 UTC = 2026-11-01 01:00:00 PDT (before transition)
      const result = utcToPacific('2026-11-01T08:00:00Z');
      expect(result).toBe('2026-11-01T01:00:00-07:00');
    });

    it('handles end of day boundary (23:59:59)', () => {
      // 2026-01-15 07:59:59 UTC = 2026-01-14 23:59:59 PST
      const result = utcToPacific('2026-01-15T07:59:59Z');
      expect(result).toBe('2026-01-14T23:59:59-08:00');
    });

    it('throws error on empty string', () => {
      expect(() => utcToPacific('')).toThrow('Invalid input: timestamp must be a non-empty string');
    });

    it('throws error on malformed ISO string', () => {
      expect(() => utcToPacific('not-a-date')).toThrow('Invalid timestamp');
    });

    it('throws error on null input', () => {
      expect(() => utcToPacific(null as any)).toThrow('Invalid input: timestamp must be a non-empty string');
    });

    it('throws error on undefined input', () => {
      expect(() => utcToPacific(undefined as any)).toThrow('Invalid input: timestamp must be a non-empty string');
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

    it('handles DST spring forward transition (2026-03-08)', () => {
      // 2026-03-08 10:00 UTC = 2026-03-08 02:00 PDT
      const result = getSessionDate('2026-03-08T10:00:00Z');
      expect(result).toBe('2026-03-08');
    });

    it('handles DST fall back transition (2026-11-01)', () => {
      // 2026-11-01 08:00 UTC = 2026-11-01 01:00 PST
      const result = getSessionDate('2026-11-01T08:00:00Z');
      expect(result).toBe('2026-11-01');
    });

    it('handles end of day boundary (23:59:59)', () => {
      // 2026-01-15 07:59:59 UTC = 2026-01-14 23:59:59 PST
      const result = getSessionDate('2026-01-15T07:59:59Z');
      expect(result).toBe('2026-01-14');
    });

    it('throws error on empty string', () => {
      expect(() => getSessionDate('')).toThrow('Invalid input: timestamp must be a non-empty string');
    });

    it('throws error on malformed ISO string', () => {
      expect(() => getSessionDate('invalid-date')).toThrow('Invalid timestamp');
    });

    it('throws error on null input', () => {
      expect(() => getSessionDate(null as any)).toThrow('Invalid input: timestamp must be a non-empty string');
    });

    it('throws error on undefined input', () => {
      expect(() => getSessionDate(undefined as any)).toThrow('Invalid input: timestamp must be a non-empty string');
    });
  });
});
