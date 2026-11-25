import { Capacitor } from "@capacitor/core";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isNativeIOS() {
  return isNativeApp() && Capacitor.getPlatform() === "ios";
}
