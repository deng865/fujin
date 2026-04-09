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

  // Fallback: if the above didn't work, try window.open
  setTimeout(() => {
    if (document.hasFocus()) {
      const win = window.open(urls[app], "_blank");
      // Final fallback: copy coordinates to clipboard
      if (!win) {
        navigator.clipboard.writeText(`${lat}, ${lng}`).then(() => {
          // Use a simple alert as toast may not be available here
          alert("坐标已复制到剪贴板，请打开地图App粘贴搜索");
        }).catch(() => {
          prompt("请复制以下坐标到地图App中搜索：", `${lat}, ${lng}`);
        });
      }
    }
  }, 500);
}
