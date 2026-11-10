export interface Coords { lat: number; lng: number }

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

export function formatMi(mi: number): string {
  if (mi < 0.1) return "附近";
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

/** Map is only used for rides; every other category is a distance list. */
export const MAP_CATEGORIES = new Set(["driver"]);

export function postCoords(p: { latitude: number; longitude: number; is_mobile?: boolean | null; live_latitude?: number | null; live_longitude?: number | null }): Coords {
  if (p.is_mobile && p.live_latitude != null && p.live_longitude != null) return { lat: p.live_latitude, lng: p.live_longitude };
  return { lat: p.latitude, lng: p.longitude };
}

export function sortByDistance<T extends { latitude: number; longitude: number }>(items: T[], origin: Coords): (T & { distance: number })[] {
  return items
    .map((p) => ({ ...p, distance: distanceMi(origin, postCoords(p)) }))
    .sort((a, b) => a.distance - b.distance);
}
