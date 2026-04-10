/**
 * Check if a store with given operating_hours is currently open.
 * operating_hours format: { open: "09:00", close: "21:00", timezone: "America/Chicago" }
 */
export function isCurrentlyOpen(operatingHours: {
  open: string;
  close: string;
  timezone?: string;
} | null): boolean | null {
  if (!operatingHours || !operatingHours.open || !operatingHours.close) return null;

  const tz = operatingHours.timezone || "America/Chicago";

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
    const nowMin = h * 60 + m;

    const [oh, om] = operatingHours.open.split(":").map(Number);
    const [ch, cm] = operatingHours.close.split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    // Handle overnight hours (e.g. 22:00 - 06:00)
    if (closeMin <= openMin) {
      return nowMin >= openMin || nowMin < closeMin;
    }

    return nowMin >= openMin && nowMin < closeMin;
  } catch {
    return null;
  }
}
