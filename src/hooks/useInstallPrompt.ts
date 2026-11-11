import { useSyncExternalStore } from "react";
import { shouldShowInstallBanner } from "@/lib/installVisibility";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALLED_KEY = "home_screen_installed";
const DISMISSED_KEY = "install_banner_dismissed_at";
const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
function readStorage(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Private browsing may disallow storage. */ }
}
const media = window.matchMedia("(display-mode: standalone)");
const isStandalone = () => media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isNative = () => (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true;
if (isStandalone()) writeStorage(INSTALLED_KEY, "true");
let state = { installed: isStandalone() || readStorage(INSTALLED_KEY) === "true", canPrompt: false, visible: false };

function update() {
  const standalone = isStandalone();
  if (standalone) writeStorage(INSTALLED_KEY, "true");
  const installed = standalone || readStorage(INSTALLED_KEY) === "true" || state.installed;
  state = {
    installed,
    canPrompt: deferredPrompt !== null,
    visible: shouldShowInstallBanner({ installed, standalone, native: isNative(), dismissedAt: Number(readStorage(DISMISSED_KEY) || 0), now: Date.now() }),
  };
  listeners.forEach(listener => listener());
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  // A new install prompt means the browser considers this app not installed.
  writeStorage(INSTALLED_KEY, "false");
  state = { ...state, installed: false };
  update();
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  writeStorage(INSTALLED_KEY, "true");
  state = { ...state, installed: true };
  update();
});
media.addEventListener("change", update);
window.addEventListener("storage", update);
window.addEventListener("pageshow", update);
window.addEventListener("focus", update);
update();

export function dismissInstallBanner() {
  writeStorage(DISMISSED_KEY, String(Date.now()));
  state = { ...state, visible: false };
  listeners.forEach(listener => listener());
}

export async function promptInstallation() {
  const prompt = deferredPrompt;
  if (!prompt) return false;
  deferredPrompt = null;
  update();
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      writeStorage(INSTALLED_KEY, "true");
      state = { ...state, installed: true };
    }
    update();
    return true;
  } catch {
    update();
    return false;
  }
}

export function useInstallPrompt() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => state);
}