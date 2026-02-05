// File: src/lib/timezone.ts

export type TimezoneDetectionSource = "browser" | "ip" | "manual" | "verification" | "signup";

export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && typeof tz === "string" ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export function getSupportedTimezones(): string[] {
  try {
    // Modern browsers (Chromium/Firefox/Safari TP) support supportedValuesOf
    // Falls back to a curated list if unavailable.
    // @ts-ignore
    const vals = Intl.supportedValuesOf?.("timeZone") as string[] | undefined;
    if (Array.isArray(vals) && vals.length) return vals;
  } catch {
    // ignore
  }

  return [
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tashkent",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Tokyo",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
  ];
}
