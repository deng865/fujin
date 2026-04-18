/**
 * Fuzzy location for mobile merchants.
 *
 * Single-layer protection: a deterministic offset (0.001°–0.003°, ~110–330m)
 * is added to the real coordinate. The offset is seeded by
 * (postId + 10-minute time window), so it is stable inside one window (no
 * jitter), rotates every 10 minutes, and lets the icon smoothly follow the
 * merchant's real movement while never exposing the precise coordinate.
 */

const ROTATION_WINDOW_MS = 10 * 60 * 1000;

export interface FuzzyResult {
  lat: number;
  lng: number;
}

/**
 * Deterministic [0, 1) PRNG from a string seed (xmur3 + mulberry32 lite).
 * Same seed → same number on every call across sessions.
 */
function seededRandom(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  // mulberry32 single step
  let t = (h + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Returns the fuzzified coordinate for a mobile merchant.
 * The output is stable for ~10 minutes inside the same grid cell.
 */
export function fuzzifyLocation(
  lat: number,
  lng: number,
  postId: string,
  now: number = Date.now(),
): FuzzyResult {
  const { gridLat, gridLng, gridId } = snapToGrid(lat, lng);
  const windowSlot = Math.floor(now / ROTATION_WINDOW_MS);
  const seedBase = `${gridId}_${postId}_${windowSlot}`;

  const r1 = seededRandom(seedBase + "_lat");
  const r2 = seededRandom(seedBase + "_lng");
  const s1 = seededRandom(seedBase + "_slat");
  const s2 = seededRandom(seedBase + "_slng");

  // Magnitude in [0.001°, 0.003°] with random sign.
  const offLat = (0.001 + r1 * 0.002) * (s1 > 0.5 ? 1 : -1);
  const offLng = (0.001 + r2 * 0.002) * (s2 > 0.5 ? 1 : -1);

  return { lat: gridLat + offLat, lng: gridLng + offLng, gridId };
}

/** Milliseconds until the next 10-minute rotation boundary. */
export function msUntilNextRotation(now: number = Date.now()): number {
  return ROTATION_WINDOW_MS - (now % ROTATION_WINDOW_MS);
}

export const FUZZY_ROTATION_WINDOW_MS = ROTATION_WINDOW_MS;
