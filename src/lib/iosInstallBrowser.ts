export function getIOSInstallBrowser(userAgent: string, platform: string, maxTouchPoints: number): "safari" | "chrome" | "other" | null {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  if (!ios || /MicroMessenger/i.test(userAgent)) return null;
  if (/CriOS/i.test(userAgent)) return "chrome";
  if (/Safari/i.test(userAgent) && !/FxiOS|EdgiOS|OPiOS/i.test(userAgent)) return "safari";
  return "other";
}