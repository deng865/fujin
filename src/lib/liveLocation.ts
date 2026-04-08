export interface LiveLocationPosition {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_METERS = 6371000;

export const LIVE_LOCATION_MOVE_THRESHOLD_METERS = 15;
export const LIVE_LOCATION_HEARTBEAT_MS = 5000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(a: LiveLocationPosition, b: LiveLocationPosition) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function haversineMiles(a: LiveLocationPosition, b: LiveLocationPosition) {
  return haversineMeters(a, b) / 1609.344;
}

export function hasMeaningfulPositionChange(
  previous: LiveLocationPosition | null,
  next: LiveLocationPosition,
  thresholdMeters = LIVE_LOCATION_MOVE_THRESHOLD_METERS,
) {
  return !previous || haversineMeters(previous, next) >= thresholdMeters;
}