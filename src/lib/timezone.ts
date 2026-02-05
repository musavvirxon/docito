// File: src/lib/timezone.ts

export function getBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === "string" && tz.trim().length > 0) return tz;
  } catch {
    // ignore
  }
  return "UTC";
}
