import { isCurrentlyOpen } from './operatingHours';
export const PRIVACY_EVENT = 'location-privacy-changed';
export const BROWSE_KEY = 'browse_location_enabled';
export const SERVICE_KEY = 'location_sharing_enabled';
export function readPreference(key: string) { return localStorage.getItem(key) !== 'false'; }
export function savePreference(key: string, value: boolean) {
  localStorage.setItem(key, String(value));
  window.dispatchEvent(new Event(PRIVACY_EVENT));
}
export function mobileOnline(post: { is_visible: boolean; operating_hours: Parameters<typeof isCurrentlyOpen>[0] }, enabled = true) {
  return enabled && post.is_visible && (!post.operating_hours || isCurrentlyOpen(post.operating_hours) === true);
}
