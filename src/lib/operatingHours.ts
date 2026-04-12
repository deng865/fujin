/**
 * Check if a store with given operating_hours is currently open.
 *
 * Supports TWO formats:
 *
 * Legacy: { open: "09:00", close: "21:00", timezone: "America/Chicago" }
 *
 * New weekly schedule:
 * {
 *   is24h: boolean,
 *   timezone: "America/Chicago",
 *   schedule: [{ day: 0, open: "09:00", close: "21:00", closed: false }, ...]
 * }
 *
 * day 0 = Monday … 6 = Sunday
 */

interface LegacyHours {
  open: string;
  close: string;
  timezone?: string;
}

interface DayEntry {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

interface WeeklyHours {
  is24h?: boolean;
  timezone?: string;
  schedule?: DayEntry[];
}

type OperatingHours = (LegacyHours & WeeklyHours) | null;

function getNowInTz(tz: string) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  return { h, m, nowMin: h * 60 + m, weekday };
}

// Map JS weekday short names to our 0-6 Mon-Sun index
const WEEKDAY_MAP: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

function checkTimeRange(nowMin: number, openStr: string, closeStr: string): boolean {
  const [oh, om] = openStr.split(":").map(Number);
  const [ch, cm] = closeStr.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  // Handle overnight hours (e.g. 22:00 - 06:00)
  if (closeMin <= openMin) {
    return nowMin >= openMin || nowMin < closeMin;
  }
  return nowMin >= openMin && nowMin < closeMin;
}

export function isCurrentlyOpen(operatingHours: OperatingHours): boolean | null {
  if (!operatingHours) return null;

  const tz = operatingHours.timezone || "America/Chicago";

  try {
    // New format: weekly schedule
    if ("is24h" in operatingHours || "schedule" in operatingHours) {
      if (operatingHours.is24h) return true;

      const schedule = operatingHours.schedule;
      if (!schedule || !Array.isArray(schedule) || schedule.length === 0) return null;

      const { nowMin, weekday } = getNowInTz(tz);
      const dayIndex = WEEKDAY_MAP[weekday];
      if (dayIndex === undefined) return null;

      const entry = schedule.find((d) => d.day === dayIndex);
      if (!entry) return null;
      if (entry.closed) return false;
      if (!entry.open || !entry.close) return null;

      return checkTimeRange(nowMin, entry.open, entry.close);
    }

    // Legacy format
    if (!operatingHours.open || !operatingHours.close) return null;

    const { nowMin } = getNowInTz(tz);
    return checkTimeRange(nowMin, operatingHours.open, operatingHours.close);
  } catch {
    return null;
  }
}
