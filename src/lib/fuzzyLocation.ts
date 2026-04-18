/**
 * Fuzzy location for mobile merchants.
 *
 * Two-layer protection:
 * 1) Grid snap (~500m): the real coordinate is snapped to the center of a
 *    ~500m virtual grid cell. As long as the merchant stays inside that
 *    cell, the map circle does not move at all.
 * 2) Deterministic per-window offset (0.001°–0.003°, ~110–330m): a
 *    pseudo-random offset is added on top of the grid center. The offset is
 *    seeded by (gridId + postId + 10-minute time window), so it is stable
 *    inside one window (no jitter) and rotates every 10 minutes.
 *
 * The real coordinate never reaches the map render layer.
 */

// 1° latitude ≈ 111 km → 500m ≈ 0.0045°
const GRID_SIZE_DEG = 0.0045;
const ROTATION_WINDOW_MS = 10 * 60 * 1000;

export interface FuzzyResult {
  lat: number;
  lng: number;
  gridId: string;
}

function snapToGrid(lat: number, lng: number) {
  const gridLat =
    Math.floor(lat / GRID_SIZE_DEG) * GRID_SIZE_DEG + GRID_SIZE_DEG / 2;
  // Longitude degrees shrink toward the poles — keep cells roughly square.
  const lngStep = GRID_SIZE_DEG / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const gridLng =
    Math.floor(lng / lngStep) * lngStep + lngStep / 2;
  const gridId = `${Math.round(gridLat * 1e5)}_${Math.round(gridLng * 1e5)}`;
  return { gridLat, gridLng, gridId };
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
