import { describe, expect, test } from "bun:test";
import { getIOSInstallBrowser } from "./iosInstallBrowser";

describe("Apple home-screen guidance across browsers", () => {
  test("iPhone Safari receives Apple guidance", () => expect(getIOSInstallBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1", "iPhone", 5)).toBe("safari"));
  test("iPhone Chrome receives Apple guidance without an install event", () => expect(getIOSInstallBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0 Mobile Safari/604.1", "iPhone", 5)).toBe("chrome"));
  test("desktop-mode iPad receives Apple guidance", () => expect(getIOSInstallBrowser("Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1", "MacIntel", 5)).toBe("safari"));
  test("Android retains its own installation flow", () => expect(getIOSInstallBrowser("Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36", "Linux", 5)).toBeNull());
  test("Mac Safari does not receive phone guidance", () => expect(getIOSInstallBrowser("Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1", "MacIntel", 0)).toBeNull());
  test("WeChat keeps its external-browser instructions", () => expect(getIOSInstallBrowser("Mozilla/5.0 (iPhone) Mobile MicroMessenger/8.0", "iPhone", 5)).toBeNull());
});