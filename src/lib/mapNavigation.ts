/**
 * Map navigation URL builders.
 * 
 * These functions build URLs for Apple Maps and Google Maps.
 * The actual navigation is triggered by MapChoiceSheet component.
 */

export function buildAppleMapsUrl(lat: number, lng: number): string {
  return `maps://?daddr=${lat},${lng}&dirflg=d`;
}

export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
}

export function buildAppleMapsUrlWithQuery(
  query: string,
  coords: { lat: number; lng: number } | null | undefined
): string {
  if (coords) return `maps://?daddr=${coords.lat},${coords.lng}&dirflg=d`;
  return `maps://?daddr=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsUrlWithQuery(
  query: string,
  coords: { lat: number; lng: number } | null | undefined
): string {
  if (coords) return `comgooglemaps://?daddr=${coords.lat},${coords.lng}&directionsmode=driving`;
  return `comgooglemaps://?daddr=${encodeURIComponent(query)}&directionsmode=driving`;
}

/**
 * Navigate to Apple Maps (legacy helper, used by MapChoiceSheet internally).
 */
export function navigateToAppleMaps(lat: number, lng: number) {
  window.location.href = buildAppleMapsUrl(lat, lng);
}

export function navigateToGoogleMaps(lat: number, lng: number) {
  window.location.href = buildGoogleMapsUrl(lat, lng);
}
