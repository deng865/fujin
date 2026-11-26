export interface Coords { lat: number; lng: number }
export type DistanceUnit = "mi" | "km";
export type DistanceUnitPref = "auto" | DistanceUnit;

export const DISTANCE_UNIT_STORAGE_KEY = "distance_unit_pref";
export const DISTANCE_UNIT_EVENT = "distance-unit-change";
const KM_PER_MI = 1.609344;

/** Bounding boxes for countries/territories where road distances use miles (US, UK, Myanmar, Liberia). */
const IMPERIAL_REGIONS: [number, number, number, number][] = [
  [24.3, 49.4, -125.0, -66.8],  // Contiguous US
  [51.2, 71.5, -179.2, -129.9], // Alaska
  [18.8, 22.3, -160.3, -154.7], // Hawaii
  [17.6, 18.6, -67.3, -64.5],   // Puerto Rico & USVI
  [49.8, 60.9, -8.2, 1.8],      // United Kingdom
  [9.7, 28.6, 92.1, 101.2],     // Myanmar
  [4.3, 8.6, -11.5, -7.3],      // Liberia
];

export function detectDistanceUnit(origin: Coords): DistanceUnit {
  const inImperial = IMPERIAL_REGIONS.some(
    ([minLat, maxLat, minLng, maxLng]) =>
      origin.lat >= minLat && origin.lat <= maxLat && origin.lng >= minLng && origin.lng <= maxLng,
  );
  return inImperial ? "mi" : "km";
}

export function getDistanceUnitPref(): DistanceUnitPref {
  try {
    const v = localStorage.getItem(DISTANCE_UNIT_STORAGE_KEY);
    if (v === "mi" || v === "km" || v === "auto") return v;
  } catch {}
  return "auto";
}

export function setDistanceUnitPref(pref: DistanceUnitPref): void {
  try {
    localStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, pref);
    window.dispatchEvent(new Event(DISTANCE_UNIT_EVENT));
  } catch {}
}

export function resolveDistanceUnit(origin: Coords, pref: DistanceUnitPref = "auto"): DistanceUnit {
  return pref === "auto" ? detectDistanceUnit(origin) : pref;
}

export function buildWhatsAppUrl(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}

export const CITIES = [
  { name: "达拉斯", lat: 32.7767, lng: -96.797 },
  { name: "纽约", lat: 40.7282, lng: -73.9342 },
  { name: "洛杉矶", lat: 34.0485, lng: -118.1447 },
  { name: "旧金山", lat: 37.7946, lng: -122.4074 },
  { name: "芝加哥", lat: 41.8479, lng: -87.632 },
];

export function distanceMi(a: Coords, b: Coords): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(mi: number, unit: DistanceUnit): string {
  if (unit === "km") {
    const km = mi * KM_PER_MI;
    if (km < 0.1) return "附近";
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  }
  if (mi < 0.1) return "附近";
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

export function formatMi(mi: number): string {
  return formatDistance(mi, "mi");
}

/** No category opens a map; maps appear only inside an active ride chat. */
export const MAP_CATEGORIES = new Set<string>();

export function postCoords(p: { latitude: number; longitude: number; is_mobile?: boolean | null; live_latitude?: number | null; live_longitude?: number | null }): Coords {
  if (p.is_mobile && p.live_latitude != null && p.live_longitude != null) return { lat: p.live_latitude, lng: p.live_longitude };
  return { lat: p.latitude, lng: p.longitude };
}

export function sortByDistance<T extends { latitude: number; longitude: number }>(items: T[], origin: Coords): (T & { distance: number })[] {
  return items
    .map((p) => ({ ...p, distance: distanceMi(origin, postCoords(p)) }))
    .sort((a, b) => a.distance - b.distance);
}

/** Radius quick filters in miles; null = no limit. */
export const RADIUS_OPTIONS: { label: string; mi: number | null }[] = [
  { label: "5 mi 内", mi: 5 }, { label: "15 mi 内", mi: 15 }, { label: "不限", mi: null },
];

export function getRadiusOptions(unit: DistanceUnit): { label: string; mi: number | null }[] {
  if (unit === "km") {
    return [
      { label: "10 km 内", mi: 10 / KM_PER_MI },
      { label: "25 km 内", mi: 25 / KM_PER_MI },
      { label: "不限", mi: null },
    ];
  }
  return RADIUS_OPTIONS;
}

export function withinRadius<T extends { distance: number }>(items: T[], mi: number | null): T[] {
  return mi == null ? items : items.filter((p) => p.distance <= mi);
}

/** Highest rated first; unrated last; ties broken by distance. */
export function sortByRating<T extends { distance: number; rating: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.distance - b.distance);
}

export const HOT_SEARCHES = ["接送", "美食", "月嫂保姆", "水暖电工", "汽车维修", "移民律师", "美甲", "租房"];
