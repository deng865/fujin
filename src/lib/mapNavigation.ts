/**
 * Unified map navigation helper.
 * Opens the selected map app in a new tab. Falls back to clipboard copy.
 */
export function openMapNavigation(lat: number, lng: number, app: "apple" | "google") {
  const urls = {
    apple: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
  };

  const url = urls[app];

  // Try window.open first (must be synchronous from user click)
  const win = window.open(url, "_blank", "noopener,noreferrer");

  if (!win) {
    // Fallback: inject a real <a> and click it
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);

    // Final fallback after a short delay: copy coords
    setTimeout(() => {
      if (document.hasFocus()) {
        navigator.clipboard.writeText(`${lat}, ${lng}`).then(() => {
          alert("坐标已复制到剪贴板，请打开地图App粘贴搜索");
        }).catch(() => {
          prompt("请复制以下坐标到地图App中搜索：", `${lat}, ${lng}`);
        });
      }
    }, 800);
  }
}
