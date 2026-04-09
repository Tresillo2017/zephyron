import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateTopArtists,
  calculateTopGenre,
  calculateDiscoveries,
  calculateStreak,
  calculateLongestSet,
} from './stats';

describe('Stats Aggregation Utilities', () => {
  describe('calculateTopArtists', () => {
    it('returns artists weighted by duration, sorted DESC', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [
                  { track_artist: 'Artist A', total_duration: 3600 },
                  { track_artist: 'Artist B', total_duration: 2400 },
                  { track_artist: 'Artist C', total_duration: 1200 },
                ],
              }),
              first: async () => ({}),
            }),
          }),
        },
      };

      const result = await calculateTopArtists(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30',
        3
      );

      expect(result).toEqual(['Artist A', 'Artist B', 'Artist C']);
      expect(result[0]).toBe('Artist A'); // highest duration first
    });

    it('respects the limit parameter', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => {
              // params[3] is the limit
              const limit = params[3] as number;
              const allResults = [
                { track_artist: 'Artist A', total_duration: 3600 },
                { track_artist: 'Artist B', total_duration: 2400 },
                { track_artist: 'Artist C', total_duration: 1200 },
              ];
              return {
                all: async () => ({
                  results: allResults.slice(0, limit),
                }),
                first: async () => ({}),
              };
            },
          }),
        },
      };

      const result = await calculateTopArtists(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30',
        2
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(['Artist A', 'Artist B']);
    });

    it('returns empty array when no artists found', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [],
              }),
              first: async () => ({}),
            }),
          }),
        },
      };

      const result = await calculateTopArtists(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30',
        10
      );

      expect(result).toEqual([]);
    });

    it('divides session duration by track count (Cartesian product fix)', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => {
            // Verify the query contains the track_count join and division
            expect(query).toContain('/ track_count.count');
            expect(query).toContain('COUNT(*) as count');
            return {
              bind: (...params: unknown[]) => ({
                all: async () => ({
                  // If a 1-hour session had 15 tracks and artist A is on 5 tracks:
                  // Old (buggy) query: 5 * 3600 = 18000 seconds
                  // New (fixed) query: SUM(3600 / 15) for each of the 5 tracks = 1200 seconds
                  results: [
                    { track_artist: 'Artist A', total_duration: 1200 },
                  ],
                }),
                first: async () => ({}),
              }),
            };
          },
        },
      };

      const result = await calculateTopArtists(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30',
        10
      );

      expect(result).toEqual(['Artist A']);
    });
  });

  describe('calculateTopGenre', () => {
    it('returns the most listened genre', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [
                  { genre: 'Techno', play_count: 15 },
                  { genre: 'House', play_count: 8 },
                ],
              }),
              first: async () => ({
                genre: 'Techno',
              }),
            }),
          }),
        },
      };

      const result = await calculateTopGenre(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30'
      );

      expect(result).toBe('Techno');
    });

    it('returns null when no genres found', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [],
              }),
              first: async () => null,
            }),
          }),
        },
      };

      const result = await calculateTopGenre(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30'
      );

      expect(result).toBeNull();
    });
  });

  describe('calculateDiscoveries', () => {
    it('returns count of new artists in time window', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [],
              }),
              first: async () => ({
                discovery_count: 5,
              }),
            }),
          }),
        },
      };

      const result = await calculateDiscoveries(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30'
      );

      expect(result).toBe(5);
    });

    it('returns 0 when no new discoveries', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [],
              }),
              first: async () => null,
            }),
          }),
        },
      };

      const result = await calculateDiscoveries(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30'
      );

      expect(result).toBe(0);
    });
  });

  describe('calculateStreak', () => {
    it('finds longest consecutive day sequence', () => {
      const dates = ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-05', '2026-04-06'];
      const result = calculateStreak(dates);
      expect(result).toBe(3); // 2026-04-01, 02, 03
    });

    it('handles single day (returns 1)', () => {
      const dates = ['2026-04-01'];
      const result = calculateStreak(dates);
      expect(result).toBe(1);
    });

    it('handles empty array (returns 0)', () => {
      const dates: string[] = [];
      const result = calculateStreak(dates);
      expect(result).toBe(0);
    });

    it('handles all consecutive days', () => {
      const dates = ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05'];
      const result = calculateStreak(dates);
      expect(result).toBe(5);
    });

    it('handles gaps in dates', () => {
      const dates = ['2026-04-01', '2026-04-03', '2026-04-05'];
      const result = calculateStreak(dates);
      expect(result).toBe(1); // each day is isolated
    });

    it('handles multiple streaks and returns the longest', () => {
      const dates = [
        '2026-04-01',
        '2026-04-02',
        '2026-04-05',
        '2026-04-06',
        '2026-04-07',
        '2026-04-08',
      ];
      const result = calculateStreak(dates);
      expect(result).toBe(4); // 2026-04-05 to 08
    });
  });

  describe('calculateLongestSet', () => {
    it('returns set_id with most listening time', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [],
              }),
              first: async () => ({
                set_id: 'set-123',
              }),
            }),
          }),
        },
      };

      const result = await calculateLongestSet(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30'
      );

      expect(result).toBe('set-123');
    });

    it('returns null when no sets found', async () => {
      const mockEnv = {
        DB: {
          prepare: (query: string) => ({
            bind: (...params: unknown[]) => ({
              all: async () => ({
                results: [],
              }),
              first: async () => null,
            }),
          }),
        },
      };

      const result = await calculateLongestSet(
        mockEnv as unknown as Env,
        'user-123',
        '2026-04-01',
        '2026-04-30'
      );

      expect(result).toBeNull();
    });
  });
});
