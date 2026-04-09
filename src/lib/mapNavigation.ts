/**
 * Unified map navigation helper.
 * Uses window.location.href to avoid popup blockers and target="_blank" issues
 * in iOS WebViews, PWAs, and embedded browsers.
 */
export function openMapNavigation(lat: number, lng: number, app: "apple" | "google") {
  const urls = {
    apple: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
  };

  // Use a temporary anchor element to trigger navigation
  // This is more reliable than window.location.href in WebViews
  // because it preserves the current page in history
  const a = document.createElement("a");
  a.href = urls[app];
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  // Some WebViews block programmatic .click() on anchors not in DOM
  document.body.appendChild(a);
  a.click();
  // Clean up after a tick
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);

  // Fallback: if the above didn't work (some restrictive WebViews),
  // try direct location assignment after a short delay
  setTimeout(() => {
    // Only fallback if the page is still focused (meaning navigation didn't happen)
    if (document.hasFocus()) {
      window.location.href = urls[app];
    }
  }, 500);
}
