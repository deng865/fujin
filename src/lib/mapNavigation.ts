/**
 * Unified map navigation helper.
 * Works in normal browsers, PWA, and iOS WKWebView (test app).
 *
 * Strategy:
 * 1. Try native URL schemes first (maps:// for Apple, comgooglemaps:// for Google)
 *    — WKWebView hands these off to the OS automatically.
 * 2. Fall back to HTTPS URLs via window.open / <a> click.
 * 3. Final fallback: copy coordinates to clipboard.
 *
 * IMPORTANT: Never use window.location.href — it replaces the current page
 * and users cannot return to the app.
 */

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function buildUrls(lat: number, lng: number, app: "apple" | "google") {
  if (app === "apple") {
    return {
      scheme: `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      https: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
    };
  }
  return {
    scheme: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
    https: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
  };
}

function buildUrlWithQuery(
  query: string,
  coords: { lat: number; lng: number } | null | undefined,
  app: "apple" | "google"
) {
  if (coords) {
    return buildUrls(coords.lat, coords.lng, app);
  }
  if (app === "apple") {
    return {
      scheme: `maps://maps.apple.com/?daddr=${encodeURIComponent(query)}`,
      https: `https://maps.apple.com/?daddr=${encodeURIComponent(query)}`,
    };
  }
  return {
    scheme: `comgooglemaps://?daddr=${encodeURIComponent(query)}&directionsmode=driving`,
    https: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
  };
}

/**
 * Try to navigate to a URL. Returns true if it likely succeeded.
 */
function tryOpen(url: string): boolean {
  // Attempt 1: window.open
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) return true;

  // Attempt 2: inject <a> and click
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 200);
  return false; // can't confirm it worked
}

/**
 * Try a URL scheme via hidden iframe — this is the most reliable method
 * for iOS WKWebView to hand off to external apps.
 */
function tryScheme(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch {}
  }, 500);
}

function copyFallback(lat: number, lng: number) {
  const text = `${lat}, ${lng}`;
  navigator.clipboard.writeText(text).then(() => {
    alert("坐标已复制到剪贴板，请打开地图App粘贴搜索");
  }).catch(() => {
    prompt("请复制以下坐标到地图App中搜索：", text);
  });
}

/**
 * Main entry point for map navigation with coordinates.
 */
export function openMapNavigation(lat: number, lng: number, app: "apple" | "google") {
  const urls = buildUrls(lat, lng, app);

  if (isIOS()) {
    // On iOS, try the native scheme first (works in WKWebView)
    tryScheme(urls.scheme);
    // Also try HTTPS as backup after a short delay
    setTimeout(() => {
      if (document.hasFocus()) {
        // Still in app — scheme might not have worked, try HTTPS
        const opened = tryOpen(urls.https);
        if (!opened) {
          setTimeout(() => {
            if (document.hasFocus()) {
              copyFallback(lat, lng);
            }
          }, 600);
        }
      }
    }, 500);
  } else {
    // Non-iOS: just open HTTPS URL
    const opened = tryOpen(urls.https);
    if (!opened) {
      setTimeout(() => {
        if (document.hasFocus()) {
          copyFallback(lat, lng);
        }
      }, 600);
    }
  }
}

/**
 * Navigation with query string (for TripMessage where address text is used).
 */
export function openMapNavigationWithQuery(
  query: string,
  coords: { lat: number; lng: number } | null | undefined,
  app: "apple" | "google"
) {
  const urls = buildUrlWithQuery(query, coords, app);

  if (isIOS()) {
    tryScheme(urls.scheme);
    setTimeout(() => {
      if (document.hasFocus()) {
        const opened = tryOpen(urls.https);
        if (!opened) {
          setTimeout(() => {
            if (document.hasFocus()) {
              if (coords) {
                copyFallback(coords.lat, coords.lng);
              } else {
                navigator.clipboard.writeText(query).then(() => {
                  alert("地址已复制到剪贴板，请打开地图App粘贴搜索");
                }).catch(() => {
                  prompt("请复制以下地址到地图App中搜索：", query);
                });
              }
            }
          }, 600);
        }
      }
    }, 500);
  } else {
    const opened = tryOpen(urls.https);
    if (!opened) {
      setTimeout(() => {
        if (document.hasFocus()) {
          if (coords) {
            copyFallback(coords.lat, coords.lng);
          } else {
            navigator.clipboard.writeText(query).catch(() => {});
          }
        }
      }, 600);
    }
  }
}
