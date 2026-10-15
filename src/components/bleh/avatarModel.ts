import { fnv1a, xorshift32 } from './dither-kit/pixel';

export interface AvatarBlob {
  x: number; // 0-1 of the canvas
  y: number;
  r: number;
  hue: number;
  l: number;
  c: number;
}

export interface AvatarModel {
  hue: number;
  base: { l: number; c: number };
  blobs: AvatarBlob[];
}

const BLOB_COUNT = 3;
const HUE_SPREAD = [0, 1, -1]; // blobs sit on the seed hue and its two analogous neighbours

/** Seed -> hue (0-360), also drives the hero glow. First draw of the PRNG stream, so it never shifts with the layout. */
export function avatarHue(seed: string): number {
  return Math.floor(xorshift32(fnv1a(seed))() * 360);
}

/** Same seed, same avatar: a soft analogous mesh of three oklch blobs on a tinted base. */
export function avatarModel(seed: string): AvatarModel {
  const rand = xorshift32(fnv1a(seed));
  const hue = Math.floor(rand() * 360);
  const blobs = Array.from({ length: BLOB_COUNT }, (_, i): AvatarBlob => ({
    x: 0.1 + rand() * 0.8,
    y: 0.1 + rand() * 0.8,
    r: 0.55 + rand() * 0.45,
    hue: (hue + HUE_SPREAD[i] * (35 + rand() * 30) + 360) % 360,
    l: 0.74 + rand() * 0.14,
    c: 0.1 + rand() * 0.07,
  }));
  return { hue, base: { l: 0.7, c: 0.08 }, blobs };
}

/** First letter of a name or email, uppercased; empty when there is none. */
export const avatarInitial = (name?: string): string => [...(name?.trim() ?? '')][0]?.toUpperCase() ?? '';
