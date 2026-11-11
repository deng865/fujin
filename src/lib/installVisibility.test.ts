import { describe, expect, test } from "bun:test";
import { shouldShowInstallBanner } from "./installVisibility";

const base = { installed: false, standalone: false, native: false, dismissedAt: 0, now: new Date(2026, 10, 11, 15).getTime() };
describe("installation banner visibility", () => {
  test("visible for a normal website visit", () => expect(shouldShowInstallBanner(base)).toBe(true));
  test("hidden after confirmed installation", () => expect(shouldShowInstallBanner({ ...base, installed: true })).toBe(false));
  test("hidden when opened from the home screen", () => expect(shouldShowInstallBanner({ ...base, standalone: true })).toBe(false));
  test("hidden inside the native app", () => expect(shouldShowInstallBanner({ ...base, native: true })).toBe(false));
  test("closing hides it for the same calendar day", () => expect(shouldShowInstallBanner({ ...base, dismissedAt: new Date(2026, 10, 11, 9).getTime() })).toBe(false));
  test("closing does not hide it on the following day", () => expect(shouldShowInstallBanner({ ...base, dismissedAt: new Date(2026, 10, 10, 23).getTime() })).toBe(true));
});