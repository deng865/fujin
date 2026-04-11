/**
 * Unified map navigation helper.
 * 
 * Strategy: Always use maps:// scheme via window.location.href.
 * The iOS native shell has been configured to intercept maps:// URLs
 * and hand them off to the system (Apple Maps).
 *
 * No popups, no window.open, no choice dialog.
 */

function buildMapsUrl(lat: number, lng: number): string {
  return `maps://?daddr=${lat},${lng}&dirflg=d`;
}

function buildMapsUrlWithQuery(
  query: string,
  coords: { lat: number; lng: number } | null | undefined
): string {
  if (coords) {
    return `maps://?daddr=${coords.lat},${coords.lng}&dirflg=d`;
  }
  return `maps://?daddr=${encodeURIComponent(query)}`;
}

/**
 * Open map navigation for coordinates.
 * Directly navigates via maps:// scheme.
 */
export function openMapNavigation(lat: number, lng: number) {
  window.location.href = buildMapsUrl(lat, lng);
}

/**
 * Open map navigation with a query string (address text) or coordinates.
 */
export function openMapNavigationWithQuery(
  query: string,
  coords: { lat: number; lng: number } | null | undefined
) {
  window.location.href = buildMapsUrlWithQuery(query, coords);
}
